#!/usr/bin/env python3
"""
Prepare un NOUVEAU spreadsheet pour le CRM : cree les 4 onglets et ecrit les
en-tetes attendues par le backend, puis verifie l'acces en lecture/ecriture.

Remplace l'etape manuelle du README (creer 4 onglets a la main avec les bonnes
colonnes) : les en-tetes sont lues depuis sheets/*.csv, donc elles ne peuvent
pas diverger du code.

Prerequis :
  1. Creer un spreadsheet vide depuis un compte que l'EQUIPE controle
     (pas le compte personnel d'un membre).
  2. Le partager en Editeur avec l'email du service account.
  3. Activer l'API Google Sheets dans le projet GCP.

Usage :
    export GOOGLE_SHEETS_ID=<id entre /d/ et /edit dans l'URL>
    export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
    python3 scripts/bootstrap-sheet.py [--force]

--force reecrit les en-tetes d'onglets deja remplis (sinon on ne touche a rien).
"""

import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _gauth import access_token, api, load_service_account, sheet_id  # noqa: E402

TABS = ["members", "companies", "sharks", "editions"]
BASE = "https://sheets.googleapis.com/v4/spreadsheets/{}"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def expected_headers():
    """Lit la ligne d'en-tete de chaque sheets/<tab>.csv — source de verite."""
    headers = {}
    for tab in TABS:
        path = os.path.join(REPO, "sheets", tab + ".csv")
        if not os.path.exists(path):
            sys.exit("Fichier de reference manquant : {}".format(path))
        with open(path, newline="", encoding="utf-8") as handle:
            row = next(csv.reader(handle), None)
        if not row:
            sys.exit("{} est vide — impossible d'en deduire les colonnes.".format(path))
        headers[tab] = row
    return headers


def die(message, detail):
    sys.exit("{}\n  -> {}".format(message, detail))


def main() -> None:
    force = "--force" in sys.argv
    account = load_service_account()
    spreadsheet = sheet_id()
    headers = expected_headers()

    print("Service account : {}".format(account["client_email"]))
    print("Spreadsheet     : {}\n".format(spreadsheet))

    token = access_token(account)
    ok, meta = api(token, BASE.format(spreadsheet) + "?fields=properties.title,sheets.properties")
    if not ok:
        die(
            "Spreadsheet illisible. Verifier qu'il est partage en Editeur avec\n"
            "  {}\net que l'API Sheets est activee.".format(account["client_email"]),
            meta,
        )

    print("Titre : {}".format(meta["properties"]["title"]))
    existing = {s["properties"]["title"]: s["properties"]["sheetId"] for s in meta["sheets"]}
    print("Onglets presents : {}\n".format(", ".join(existing) or "(aucun)"))

    missing = [tab for tab in TABS if tab not in existing]
    if missing:
        ok, result = api(
            token,
            BASE.format(spreadsheet) + ":batchUpdate",
            method="POST",
            payload={"requests": [{"addSheet": {"properties": {"title": t}}} for t in missing]},
        )
        if not ok:
            die("Creation des onglets echouee.", result)
        for reply in result.get("replies", []):
            props = reply["addSheet"]["properties"]
            existing[props["title"]] = props["sheetId"]
        print("Onglets crees : {}".format(", ".join(missing)))

    for tab in TABS:
        ok, current = api(
            token, BASE.format(spreadsheet) + "/values/{}!A1:Z1".format(tab)
        )
        if not ok:
            die("Lecture de l'onglet '{}' echouee.".format(tab), current)

        present = current.get("values", [[]])
        present = present[0] if present else []
        if present == headers[tab]:
            print("  {:<12} en-tetes deja correctes".format(tab))
            continue
        if present and not force:
            print(
                "  {:<12} ATTENTION en-tetes differentes, non modifiees "
                "(relancer avec --force)".format(tab)
            )
            continue

        ok, result = api(
            token,
            BASE.format(spreadsheet)
            + "/values/{}!A1?valueInputOption=RAW".format(tab),
            method="PUT",
            payload={"values": [headers[tab]]},
        )
        if not ok:
            die("Ecriture des en-tetes de '{}' echouee.".format(tab), result)
        print("  {:<12} {} colonnes ecrites".format(tab, len(headers[tab])))

    junk = [t for t in existing if t not in TABS]
    print("\nPret. Renseigner dans le nouvel hebergeur :")
    print("  GOOGLE_SHEETS_ID={}".format(spreadsheet))
    if junk:
        print(
            "\nOnglets inutilises a supprimer a la main : {}".format(", ".join(junk))
        )


if __name__ == "__main__":
    main()
