#!/usr/bin/env python3
"""
Identifie le proprietaire d'un Google Sheet a partir du seul service account.

Utile quand le compte humain proprietaire est perdu : le service account garde
son acces, et l'API Drive sait repondre "qui possede ce fichier" sans aucun
consentement humain.

Lecture seule — ne modifie jamais rien.

Usage :
    export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
    export GOOGLE_SHEETS_ID=...
    python3 scripts/whois-sheet.py [id_spreadsheet]
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _gauth import access_token, api, load_service_account, sheet_id  # noqa: E402

SCOPES = " ".join([
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
])
DRIVE = "https://www.googleapis.com/drive/v3/files/{}"
SHEETS = "https://sheets.googleapis.com/v4/spreadsheets/{}"
FIELDS = (
    "id,name,createdTime,modifiedTime,ownedByMe,driveId,"
    "owners(emailAddress,displayName),"
    "sharingUser(emailAddress,displayName),"
    "lastModifyingUser(emailAddress,displayName),"
    "capabilities(canEdit,canShare,canChangeOwner)"
)


def heading(text):
    print("\n{}\n{}".format(text, "-" * len(text)))


def person(entry):
    if not entry:
        return None
    return "{} <{}>".format(
        entry.get("displayName") or "?", entry.get("emailAddress") or "email masque"
    )


def main() -> None:
    account = load_service_account()
    spreadsheet = sheet_id(sys.argv[1] if len(sys.argv) > 1 else None)

    heading("Service account")
    print("  email      : {}".format(account["client_email"]))
    print("  projet GCP : {}".format(account.get("project_id", "?")))
    print("  cle        : {}".format(account.get("private_key_id", "?")))
    print("\n  -> le projet GCP ci-dessus a ete cree par quelqu'un : si un membre")
    print("     de l'equipe y a acces (console.cloud.google.com), l'onglet IAM")
    print("     nomme ses proprietaires.")

    token = access_token(account, scope=SCOPES)

    # --- Sheets API : marche toujours, donne le contexte du document ---
    heading("Spreadsheet (API Sheets)")
    ok, meta = api(token, SHEETS.format(spreadsheet) + "?fields=properties")
    if ok:
        props = meta.get("properties", {})
        print("  titre      : {}".format(props.get("title")))
        print("  locale     : {}".format(props.get("locale")))
        print("  fuseau     : {}".format(props.get("timeZone")))
        print("\n  -> locale et fuseau sont ceux du compte createur.")
    else:
        print("  illisible : {}".format(meta))

    # --- Drive API : la reponse directe ---
    heading("Proprietaire (API Drive)")
    ok, info = api(token, DRIVE.format(spreadsheet) + "?fields=" + FIELDS
                   + "&supportsAllDrives=true")

    if not ok:
        print("  Echec : {}\n".format(info))
        project = re.search(r"project[s]?[ /](\d{6,})", str(info))
        if "has not been used in project" in str(info) or "disabled" in str(info).lower():
            print("  L'API Drive n'est pas activee sur le projet GCP.")
            if project:
                print("  Numero de projet revele par l'erreur : {}".format(project.group(1)))
                print("  Activer ici, puis relancer ce script :")
                print("    https://console.developers.google.com/apis/api/"
                      "drive.googleapis.com/overview?project={}".format(project.group(1)))
            print("\n  Activer l'API Drive ne demande QUE l'acces au projet GCP,")
            print("  pas au compte proprietaire du spreadsheet.")
        elif "404" in str(info):
            print("  Fichier introuvable : le spreadsheet a peut-etre ete supprime")
            print("  avec le compte proprietaire, ou le partage a ete revoque.")
        sys.exit(1)

    if info.get("driveId"):
        print("  Le fichier est dans un Drive partage (Shared Drive), pas dans le")
        print("  Drive personnel de quelqu'un — driveId {}".format(info["driveId"]))
        print("  -> BONNE NOUVELLE : aucun individu ne le possede. Un admin")
        print("     Workspace peut rendre l'acces sans recuperer de compte.")
    owners = info.get("owners") or []
    if owners:
        for owner in owners:
            print("  PROPRIETAIRE : {}".format(person(owner)))
    elif not info.get("driveId"):
        print("  Aucun proprietaire renvoye (email masque par le domaine).")

    for label, key in (
        ("Partage par ", "sharingUser"),
        ("Dernier edit", "lastModifyingUser"),
    ):
        who = person(info.get(key))
        if who:
            print("  {} : {}".format(label, who))

    print("\n  cree le    : {}".format(info.get("createdTime", "?")))
    print("  modifie le : {}".format(info.get("modifiedTime", "?")))
    caps = info.get("capabilities", {})
    print("  droits du service account : edit={} share={} changeOwner={}".format(
        caps.get("canEdit"), caps.get("canShare"), caps.get("canChangeOwner")))

    domains = {
        o["emailAddress"].split("@")[-1]
        for o in owners
        if o.get("emailAddress") and "@" in o["emailAddress"]
    }
    if domains:
        heading("Suite")
        for domain in domains:
            if domain in ("gmail.com", "googlemail.com"):
                print("  Compte personnel ({}) : seule la recuperation de compte".format(domain))
                print("  Google peut le rendre. Sinon, migrer vers un nouveau sheet.")
            else:
                print("  Domaine Workspace '{}' : un super-admin peut, depuis la".format(domain))
                print("  console admin, reattribuer la propriete du fichier ou")
                print("  reinitialiser le compte. C'est la voie la plus propre.")
        if caps.get("canShare"):
            print("\n  Le service account peut partager : il pourrait donner un acces")
            print("  Editeur a une adresse de l'equipe (script separe, sur demande).")


if __name__ == "__main__":
    main()
