#!/usr/bin/env python3
"""
Sauvegarde : exporte les 4 onglets du Google Sheet vers des CSV locaux.

A lancer avant toute manipulation risquee (changement d'hebergeur, rotation de
cle, migration de spreadsheet) une fois que le sheet contient de vraies donnees.
S'authentifie avec le service account, donc fonctionne meme sans acces humain au
spreadsheet.

Usage :
    export GOOGLE_SHEETS_ID=...
    export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
    python3 scripts/dump-sheets.py [dossier_sortie]
"""

import csv
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _gauth import access_token, api, load_service_account, sheet_id  # noqa: E402

TABS = ["members", "companies", "sharks", "editions"]
BASE = "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A:Z"


def main() -> None:
    account = load_service_account()
    spreadsheet = sheet_id()
    out_dir = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "backup-sheets-{}".format(datetime.date.today().isoformat())
    )
    os.makedirs(out_dir, exist_ok=True)

    print("Service account : {}".format(account["client_email"]))
    print("Spreadsheet     : {}\n".format(spreadsheet))
    token = access_token(account)

    total, failed = 0, []
    for tab in TABS:
        ok, body = api(token, BASE.format(spreadsheet, tab))
        if not ok:
            print("  {:<12} ECHEC — {}".format(tab, body), file=sys.stderr)
            failed.append(tab)
            continue

        rows = body.get("values", [])
        width = max((len(r) for r in rows), default=0)
        path = os.path.join(out_dir, tab + ".csv")
        with open(path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            for row in rows:
                writer.writerow(row + [""] * (width - len(row)))

        data_rows = max(len(rows) - 1, 0)
        total += data_rows
        print("  {:<12} {:>5} lignes -> {}".format(tab, data_rows, path))

    print("\n{} lignes exportees dans {}/".format(total, out_dir))
    if failed:
        sys.exit("Onglets en echec : {}".format(", ".join(failed)))


if __name__ == "__main__":
    main()
