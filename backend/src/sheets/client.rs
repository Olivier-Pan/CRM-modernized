use anyhow::{Context, Result};
use serde_json::{json, Value};

use super::google_auth::GoogleAuth;

pub const SHEET_MEMBERS: &str = "members";
pub const SHEET_COMPANIES: &str = "companies";
pub const SHEET_SHARKS: &str = "sharks";
pub const SHEET_EDITIONS: &str = "editions";

#[derive(Debug, Clone)]
pub struct SheetsClient {
    http_client: reqwest::Client,
    auth: GoogleAuth,
    spreadsheet_id: String,
}

impl SheetsClient {
    pub fn new(spreadsheet_id: String, auth: GoogleAuth) -> Self {
        SheetsClient {
            http_client: reqwest::Client::new(),
            auth,
            spreadsheet_id,
        }
    }

    /// Reads all data rows from a sheet (skipping header row 1).
    /// Returns (row_data, sheet_row_index) where row_index is 1-based (row 2 = index 2).
    pub async fn read_sheet(&self, sheet_name: &str) -> Result<Vec<(Vec<String>, usize)>> {
        Ok(self.read_sheet_with_header(sheet_name).await?.1)
    }

    /// Like `read_sheet`, but also returns the header row (row 1), which the same
    /// API call already carries. A missing or empty header comes back as an empty
    /// Vec — never an error.
    pub async fn read_sheet_with_header(
        &self,
        sheet_name: &str,
    ) -> Result<(Vec<String>, Vec<(Vec<String>, usize)>)> {
        let token = self.auth.get_access_token().await?;

        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A:Z",
            self.spreadsheet_id, sheet_name
        );

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&token)
            .send()
            .await
            .context("Failed to read sheet")?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Sheets API read failed ({}): {}", status, body);
        }

        let body: Value = response.json().await.context("Failed to parse sheet response")?;

        let rows = body["values"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        let cells = |row: &Value| -> Vec<String> {
            row.as_array()
                .map(|cells| {
                    cells
                        .iter()
                        .map(|v| v.as_str().unwrap_or("").to_string())
                        .collect()
                })
                .unwrap_or_default()
        };

        let mut rows = rows.into_iter();
        // Index 0 in the array = sheet row 1 = header.
        let header = rows.next().map(|row| cells(&row)).unwrap_or_default();

        // Data rows with their 1-based sheet row index (data starts at row 2)
        let result = rows
            .enumerate()
            .map(|(i, row)| {
                let sheet_row = i + 2; // row 2 is first data row
                (cells(&row), sheet_row)
            })
            .filter(|(row, _)| !row.is_empty() && !row[0].is_empty())
            .collect();

        Ok((header, result))
    }

    /// Appends a new row to the sheet.
    ///
    /// RAW, like every write here: USER_ENTERED would turn a value starting with
    /// '=' into a live formula — and a formula in a field a company controls
    /// could read staff-only columns (password, internal remark) back to it.
    pub async fn append_row(&self, sheet_name: &str, values: Vec<String>) -> Result<()> {
        let token = self.auth.get_access_token().await?;

        let url = format!(
            // Anchor on A1, NOT A:Z. `append` writes to the first column of the
            // *table* it detects inside the range, not the first column of the
            // range. With A:Z, one row landing off-anchor widens the detected
            // table and the next append starts further right — self-reinforcing
            // drift that silently lost 5 shark records (offsets +7, +14, +21).
            // A1 forces detection to start at column A.
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS",
            self.spreadsheet_id, sheet_name
        );

        let body = json!({
            "values": [values]
        });

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("Failed to append row")?;

        if !response.status().is_success() {
            let status = response.status();
            let resp_body = response.text().await.unwrap_or_default();
            anyhow::bail!("Sheets API append failed ({}): {}", status, resp_body);
        }

        Ok(())
    }

    /// Updates a specific row by its 1-based sheet row index. RAW: see `append_row`.
    ///
    /// Only the cells covered by `values` are written ("values with no data are
    /// skipped"): a 21-value company row never touches column V.
    pub async fn update_row(
        &self,
        sheet_name: &str,
        row_index: usize,
        values: Vec<String>,
    ) -> Result<()> {
        let token = self.auth.get_access_token().await?;

        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A{}:Z{}?valueInputOption=RAW",
            self.spreadsheet_id, sheet_name, row_index, row_index
        );

        let body = json!({
            "values": [values]
        });

        let response = self
            .http_client
            .put(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("Failed to update row")?;

        if !response.status().is_success() {
            let status = response.status();
            let resp_body = response.text().await.unwrap_or_default();
            anyhow::bail!("Sheets API update failed ({}): {}", status, resp_body);
        }

        Ok(())
    }

    /// Updates individual cells (A1 ranges inside `sheet_name`) in ONE API call.
    ///
    /// Used for targeted writes that must not clobber the rest of the row: unlike
    /// `update_row`, which rewrites A:Z from an in-memory snapshot, this touches
    /// only the named cells, so a concurrent edit to other columns is preserved.
    pub async fn update_cells(&self, sheet_name: &str, cells: &[(String, String)]) -> Result<()> {
        let ranges: Vec<(String, Vec<String>)> = cells
            .iter()
            .map(|(range, value)| (range.clone(), vec![value.clone()]))
            .collect();
        self.batch_update(sheet_name, &ranges).await
    }

    /// Writes several one-row ranges (A1 range inside `sheet_name`, values from
    /// its first column on) in ONE API call: they all land, or none does.
    pub async fn batch_update(
        &self,
        sheet_name: &str,
        ranges: &[(String, Vec<String>)],
    ) -> Result<()> {
        let token = self.auth.get_access_token().await?;

        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values:batchUpdate",
            self.spreadsheet_id
        );

        let data: Vec<serde_json::Value> = ranges
            .iter()
            .map(|(range, values)| {
                json!({
                    "range": format!("{}!{}", sheet_name, range),
                    "values": [values],
                })
            })
            .collect();

        // RAW, like the rest of this client: USER_ENTERED would parse a value
        // starting with '=' or '+' as a formula (see `append_row`).
        let body = json!({ "valueInputOption": "RAW", "data": data });

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("Failed to batch update cells")?;

        if !response.status().is_success() {
            let status = response.status();
            let resp_body = response.text().await.unwrap_or_default();
            anyhow::bail!("Sheets API batchUpdate failed ({}): {}", status, resp_body);
        }

        Ok(())
    }

    /// Clears a row (used for soft-delete by blanking all cells).
    pub async fn clear_row(&self, sheet_name: &str, row_index: usize) -> Result<()> {
        let token = self.auth.get_access_token().await?;

        let url = format!(
            "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A{}:Z{}:clear",
            self.spreadsheet_id, sheet_name, row_index, row_index
        );

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&token)
            .json(&json!({}))
            .send()
            .await
            .context("Failed to clear row")?;

        if !response.status().is_success() {
            let status = response.status();
            let resp_body = response.text().await.unwrap_or_default();
            anyhow::bail!("Sheets API clear failed ({}): {}", status, resp_body);
        }

        Ok(())
    }
}
