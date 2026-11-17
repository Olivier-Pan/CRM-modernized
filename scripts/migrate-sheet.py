#!/usr/bin/env python3
"""
Recopie integralement un Google Sheet vers un nouveau, puis verifie la copie.

Sert a sortir la base de prod du spreadsheet dont le compte proprietaire est
perdu : le service account garde son acces en lecture, donc on peut tout relire
et tout reecrire dans un spreadsheet neuf appartenant a un compte que l'equipe
controle. Le spreadsheet source n'est JAMAIS modifie.

Prerequis :
  1. Creer un spreadsheet vide depuis un compte que l'EQUIPE possede.
  2. Le partager en EDITEUR avec l'email du service account.
  3. Le service account doit toujours avoir acces a l'ancien spreadsheet.

La bascule se fait appli ARRETEE : toute ecriture faite sur l'ancien sheet
entre la lecture et le basculement de GOOGLE_SHEETS_ID serait perdue.

Usage :
    export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

    # 1. Repetition en journee — ne touche a rien, valide tout le reste
    python3 scripts/migrate-sheet.py --from <ANCIEN> --to <NOUVEAU> --dry-run

    # 2. La nuit, appli arretee — la vraie copie
    python3 scripts/migrate-sheet.py --from <ANCIEN> --to <NOUVEAU>

    # 3. Apres bascule — detecte une ecriture tardive sur l'ancien sheet
    python3 scripts/migrate-sheet.py --from <ANCIEN> --to <NOUVEAU> --verify-only
"""

import argparse
import csv
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _gauth import access_token, api, load_service_account  # noqa: E402

TABS = ["members", "companies", "sharks", "editions"]
BASE = "https://sheets.googleapis.com/v4/spreadsheets/{}"
READ_RANGE = "{}!A:ZZ"
BACKEND_LAST_COL = 26  # le backend ne lit que A:Z
PERM_CHECK_TAB = "__verif_ecriture__"


def die(message, detail=None):
    sys.exit("\nERREUR : {}{}".format(message, "\n  -> {}".format(detail) if detail else ""))


def describe(token, spreadsheet, label):
    ok, meta = api(
        token, BASE.format(spreadsheet) + "?fields=properties.title,sheets.properties"
    )
    if not ok:
        die(
            "spreadsheet {} ({}) illisible — verifier qu'il est partage avec le "
            "service account".format(label, spreadsheet),
            meta,
        )
    tabs = {s["properties"]["title"]: s["properties"] for s in meta.get("sheets", [])}
    return meta["properties"]["title"], tabs


def read_tab(token, spreadsheet, tab):
    ok, body = api(token, BASE.format(spreadsheet) + "/values/" + READ_RANGE.format(tab))
    if not ok:
        die("lecture de l'onglet '{}' impossible".format(tab), body)
    return body.get("values", [])


def rectangular(rows):
    """Normalise en matrice rectangulaire : Sheets tronque les cellules vides."""
    width = max((len(r) for r in rows), default=0)
    return [row + [""] * (width - len(row)) for row in rows]


def batch_update(token, spreadsheet, requests, what):
    ok, result = api(
        token,
        BASE.format(spreadsheet) + ":batchUpdate",
        method="POST",
        payload={"requests": requests},
    )
    if not ok:
        die(what + " echoue", result)
    return result


def check_write_access(token, spreadsheet):
    """Cree puis supprime un onglet temporaire : prouve l'acces en ecriture."""
    result = batch_update(
        token,
        spreadsheet,
        [{"addSheet": {"properties": {"title": PERM_CHECK_TAB}}}],
        "test d'ecriture sur la destination (service account en Lecteur ?)",
    )
    sheet_id = result["replies"][0]["addSheet"]["properties"]["sheetId"]
    batch_update(
        token,
        spreadsheet,
        [{"deleteSheet": {"sheetId": sheet_id}}],
        "suppression de l'onglet temporaire",
    )


def ensure_capacity(token, spreadsheet, props, rows, cols):
    """Agrandit la grille si besoin : values.update echoue hors grille."""
    grid = props.get("gridProperties", {})
    need_rows, need_cols = max(rows, grid.get("rowCount", 0)), max(cols, grid.get("columnCount", 0))
    if need_rows == grid.get("rowCount") and need_cols == grid.get("columnCount"):
        return
    batch_update(
        token,
        spreadsheet,
        [
            {
                "updateSheetProperties": {
                    "properties": {
                        "sheetId": props["sheetId"],
                        "gridProperties": {"rowCount": need_rows, "columnCount": need_cols},
                    },
                    "fields": "gridProperties.rowCount,gridProperties.columnCount",
                }
            }
        ],
        "agrandissement de la grille de '{}'".format(props["title"]),
    )


def compare(token, target, data):
    """Relit la destination et compare cellule par cellule. True si identique."""
    identical = True
    for tab in TABS:
        expected = rectangular(data[tab])
        got = rectangular(read_tab(token, target, tab))
        if expected and got:  # aligner la largeur avant comparaison
            width = max(len(expected[0]), len(got[0]))
            expected = [r + [""] * (width - len(r)) for r in expected]
            got = [r + [""] * (width - len(r)) for r in got]
        if got == expected:
            print("  OK   {:<12} {:>5} lignes identiques".format(tab, max(len(expected) - 1, 0)))
        else:
            identical = False
            print(
                "  DIFF {:<12} source {} lignes / destination {} lignes".format(
                    tab, max(len(expected) - 1, 0), max(len(got) - 1, 0)
                )
            )
    return identical


def main() -> None:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--from", dest="source", required=True, help="ID du spreadsheet source")
    parser.add_argument("--to", dest="target", required=True, help="ID du spreadsheet destination")
    parser.add_argument("--force", action="store_true", help="ecraser une destination non vide")
    parser.add_argument("--dry-run", action="store_true", help="tout valider sans rien copier")
    parser.add_argument("--verify-only", action="store_true", help="comparer source et destination")
    parser.add_argument("--backup", default=None, help="dossier de sauvegarde CSV")
    args = parser.parse_args()

    if args.source == args.target:
        die("source et destination sont le meme spreadsheet.")
    if args.dry_run and args.verify_only:
        die("--dry-run et --verify-only s'excluent.")

    account = load_service_account()
    token = access_token(account)
    print("Service account : {}".format(account["client_email"]))
    if args.dry_run:
        print("MODE REPETITION — aucune donnee ne sera copiee\n")
    else:
        print("")

    src_title, src_tabs = describe(token, args.source, "source")
    dst_title, dst_tabs = describe(token, args.target, "destination")
    print("Source      : {}  ({})".format(src_title, args.source))
    print("Destination : {}  ({})\n".format(dst_title, args.target))

    absent = [t for t in TABS if t not in src_tabs]
    if absent:
        die("onglets absents de la source : {}".format(", ".join(absent)))

    # 1. Tout lire d'abord : on ne touche a la destination que si la source est OK.
    data = {}
    for tab in TABS:
        rows = read_tab(token, args.source, tab)
        data[tab] = rows
        width = max((len(r) for r in rows), default=0)
        alert = "   [!] au-dela de Z, le backend ignorera ces colonnes" if width > BACKEND_LAST_COL else ""
        print("  lu   {:<12} {:>5} lignes, {:>2} colonnes{}".format(
            tab, max(len(rows) - 1, 0), width, alert))

    if args.verify_only:
        print("\nComparaison source / destination :")
        if compare(token, args.target, data):
            print("\nLes deux spreadsheets sont identiques — rien n'a ete perdu.")
        else:
            die("ecart detecte : des ecritures ont eu lieu sur la source apres la copie.")
        return

    # 2. Sauvegarde CSV locale avant toute ecriture.
    backup = args.backup or "backup-sheets-{}".format(
        datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
    )
    os.makedirs(backup, exist_ok=True)
    for tab, rows in data.items():
        with open(os.path.join(backup, tab + ".csv"), "w", newline="", encoding="utf-8") as handle:
            csv.writer(handle).writerows(rectangular(rows))
    print("\nSauvegarde CSV : {}/".format(backup))

    # 3. Etat de la destination : onglets manquants, donnees deja presentes.
    missing = [t for t in TABS if t not in dst_tabs]
    occupied = [
        "{} ({} lignes)".format(t, len(read_tab(token, args.target, t)) - 1)
        for t in TABS
        if t not in missing and len(read_tab(token, args.target, t)) > 1
    ]

    if args.dry_run:
        print("\nDestination :")
        print("  onglets a creer   : {}".format(", ".join(missing) or "aucun"))
        print("  onglets non vides : {}".format(", ".join(occupied) or "aucun"))
        check_write_access(token, args.target)
        print("  acces en ecriture : OK")
        if occupied:
            print("\n  [!] destination non vide — la vraie copie exigera --force.")
        print(
            "\nRepetition concluante : {} lignes pretes a etre copiees.".format(
                sum(max(len(r) - 1, 0) for r in data.values())
            )
        )
        print("Relancer sans --dry-run, APPLI ARRETEE, pour effectuer la bascule.")
        return

    if occupied and not args.force:
        die(
            "la destination contient deja des donnees : {}\n"
            "  Verifier que --to est bien le NOUVEAU spreadsheet, "
            "puis relancer avec --force.".format(", ".join(occupied))
        )

    if missing:
        result = batch_update(
            token,
            args.target,
            [{"addSheet": {"properties": {"title": t}}} for t in missing],
            "creation des onglets destination",
        )
        for reply in result.get("replies", []):
            props = reply["addSheet"]["properties"]
            dst_tabs[props["title"]] = props
        print("Onglets crees : {}".format(", ".join(missing)))

    # 4. Ecrire.
    print("")
    for tab in TABS:
        rows = rectangular(data[tab])
        if not rows:
            print("  skip  {:<11} source vide".format(tab))
            continue
        ensure_capacity(token, args.target, dst_tabs[tab], len(rows), len(rows[0]))
        ok, result = api(
            token,
            BASE.format(args.target) + "/values/{}!A:ZZ:clear".format(tab),
            method="POST",
            payload={},
        )
        if not ok:
            die("vidage de l'onglet destination '{}' echoue".format(tab), result)
        ok, result = api(
            token,
            BASE.format(args.target) + "/values/{}!A1?valueInputOption=RAW".format(tab),
            method="PUT",
            payload={"values": rows},
        )
        if not ok:
            die("ecriture de '{}' echouee".format(tab), result)
        print("  ecrit {:<11} {:>5} lignes".format(tab, len(rows) - 1))

    # 5. Relire la destination et comparer.
    print("\nVerification :")
    if not compare(token, args.target, data):
        die("la copie ne correspond pas a la source — NE PAS changer GOOGLE_SHEETS_ID.")

    print("\nCopie conforme. Bascule :")
    print("  GOOGLE_SHEETS_ID={}".format(args.target))
    print("  Redemarrer l'appli, verifier, puis relancer avec --verify-only")
    print("  pour confirmer qu'aucune ecriture n'a ete perdue.")


if __name__ == "__main__":
    main()
