#!/usr/bin/env python3
"""
Realigne les enregistrements 'sharks' decales vers la droite.

Contexte : append_row visait la plage {onglet}!A:Z. L'API Sheets ecrit dans la
premiere colonne de la TABLE qu'elle detecte dans la plage, pas dans la premiere
colonne de la plage. Une ligne tombee a cote elargit la table detectee, donc la
suivante tombe encore plus a droite (+7, +14, +21...). Ces lignes ont la colonne
A vide, et read_sheet les jette : invisibles pour l'appli, mais bien presentes.

Le correctif cote code (client.rs, ancrage sur A1) empeche la recidive ; ce
script repare l'existant.

Sans danger par defaut : n'ecrit RIEN tant que --apply n'est pas passe.
Ne touche jamais une ligne dont la colonne A est deja remplie.

Usage :
    export GOOGLE_SERVICE_ACCOUNT_JSON=~/.config/crm-genius/sa.json
    python3 scripts/repair-sharks.py --sheet <ID>            # simulation
    python3 scripts/repair-sharks.py --sheet <ID> --apply    # ecriture
"""

import argparse
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _gauth import access_token, api, load_service_account  # noqa: E402

BASE = "https://sheets.googleapis.com/v4/spreadsheets/{}"
SCHEMA = ["id", "member_id", "company_id", "contact_method", "contact_date",
          "status", "notes", "created_at", "updated_at"]
STATUSES = {"ToContact", "Contacted", "InDiscussion", "ToFollowUp",
            "VerbalAgreement", "Signed", "Refused", "NoAnswer"}
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}[T ]")


def die(message, detail=None):
    sys.exit("\nERREUR : {}{}".format(message, "\n  -> {}".format(detail) if detail else ""))


def read_tab(token, spreadsheet, tab):
    ok, body = api(token, BASE.format(spreadsheet) + "/values/{}!A:ZZ".format(tab))
    if not ok:
        die("lecture de l'onglet '{}' impossible".format(tab), body)
    return body.get("values", [])


def column_label(index):
    label, index = "", index + 1
    while index:
        index, rest = divmod(index - 1, 26)
        label = chr(65 + rest) + label
    return label


def best_shift(row, member_ids, company_ids):
    """Cherche le decalage qui reconstitue un enregistrement valide.

    Exige les trois preuves fortes : un id non vide, un member_id ET un
    company_id qui existent vraiment. Deux UUID qui retombent par hasard sur
    les bonnes tables, c'est invraisemblable.
    """
    best = None
    for shift in range(1, max(1, len(row) - 1)):
        window = [c.strip() for c in row[shift:shift + 9]]
        window += [""] * (9 - len(window))
        if not window[0] or window[1] not in member_ids or window[2] not in company_ids:
            continue
        confidence = 3
        confidence += window[5] in STATUSES
        confidence += bool(TIMESTAMP.match(window[7]))
        confidence += bool(TIMESTAMP.match(window[8]))
        if best is None or confidence > best[0]:
            best = (confidence, shift, window)
    return best


def main() -> None:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--sheet", required=True, help="ID du spreadsheet a reparer")
    parser.add_argument("--apply", action="store_true", help="ecrire (sinon simulation)")
    args = parser.parse_args()

    account = load_service_account()
    token = access_token(account)
    print("Service account : {}".format(account["client_email"]))
    print("Spreadsheet     : {}".format(args.sheet))
    if not args.apply:
        print("MODE SIMULATION — aucune ecriture\n")
    else:
        print("MODE ECRITURE\n")

    members = read_tab(token, args.sheet, "members")
    companies = read_tab(token, args.sheet, "companies")
    sharks = read_tab(token, args.sheet, "sharks")
    if not sharks:
        die("onglet 'sharks' vide.")

    member_ids = {r[0].strip() for r in members[1:] if r and r[0].strip()}
    company_ids = {r[0].strip() for r in companies[1:] if r and r[0].strip()}
    if not member_ids or not company_ids:
        die("referentiel vide : migrer les onglets members/companies d'abord.")
    print("Referentiel : {} membres, {} entreprises".format(len(member_ids), len(company_ids)))

    width = max(len(r) for r in sharks)
    visible = sum(1 for r in sharks[1:] if r and r[0].strip())
    print("Sharks      : {} lignes, {} colonnes, {} visibles par l'appli\n".format(
        len(sharks) - 1, width, visible))

    repairs, unresolved = [], []
    for offset, row in enumerate(sharks[1:]):
        sheet_row = offset + 2
        if row and row[0].strip():
            continue  # deja aligne — on n'y touche pas
        if not any(c.strip() for c in row):
            continue  # ligne reellement vide
        found = best_shift(row, member_ids, company_ids)
        if found:
            confidence, shift, window = found
            repairs.append((sheet_row, shift, window, confidence))
        else:
            unresolved.append(sheet_row)

    if not repairs:
        print("Aucune ligne decalee detectee — rien a reparer.")
        if unresolved:
            print("Lignes non vides mais non reconstituables : {}".format(
                ", ".join(map(str, unresolved))))
        return

    print("Lignes reconstituees ({} / {} indices de confiance max) :".format(
        len(repairs), 6))
    for sheet_row, shift, window, confidence in repairs:
        print("  ligne {:>2}  depuis la colonne {:<3} (decalage +{:<2})  confiance {}/6".format(
            sheet_row, column_label(shift), shift, confidence))
        print("            statut={!r} methode={!r} cree={!r}".format(
            window[5], window[3], window[7][:19]))
    if unresolved:
        print("\nNon reconstituables, laissees intactes : lignes {}".format(
            ", ".join(map(str, unresolved))))

    if not args.apply:
        print("\n{} lignes redeviendraient visibles ({} -> {}).".format(
            len(repairs), visible, visible + len(repairs)))
        print("Relancer avec --apply pour ecrire.")
        return

    # Ecriture : 9 valeurs alignees sur A, puis du vide jusqu'au bout de la
    # ligne pour effacer les cellules parasites laissees a droite.
    last = column_label(width - 1)
    data = [
        {
            "range": "sharks!A{row}:{last}{row}".format(row=sheet_row, last=last),
            "values": [window + [""] * (width - 9)],
        }
        for sheet_row, _, window, _ in repairs
    ]
    ok, result = api(
        token,
        BASE.format(args.sheet) + "/values:batchUpdate",
        method="POST",
        payload={"valueInputOption": "RAW", "data": data},
    )
    if not ok:
        die("ecriture echouee", result)
    print("\n{} cellules mises a jour.".format(result.get("totalUpdatedCells", "?")))

    # Relecture de controle
    after = read_tab(token, args.sheet, "sharks")
    now_visible = sum(1 for r in after[1:] if r and r[0].strip())
    print("Verification : {} lignes visibles par l'appli (avant : {}).".format(
        now_visible, visible))
    if now_visible != visible + len(repairs):
        die("le compte ne correspond pas — inspecter l'onglet avant de continuer.")
    print("Reparation conforme.")


if __name__ == "__main__":
    main()
