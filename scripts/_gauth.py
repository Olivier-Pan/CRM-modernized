"""
Authentification Google par service account, sans dependance externe.

Signe un JWT RS256 via openssl puis l'echange contre un access token. Utilise
par les scripts de sauvetage : ne demande que python3 + openssl, donc tourne
aussi bien en local que sur le VPS.

Important : le service account est independant du compte humain proprietaire du
spreadsheet. Perdre le compte proprietaire ne revoque pas la cle.
"""

import base64
import datetime
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request

TOKEN_URL = "https://oauth2.googleapis.com/token"
SCOPE_SHEETS = "https://www.googleapis.com/auth/spreadsheets"
SCOPE_DRIVE_RO = "https://www.googleapis.com/auth/drive.metadata.readonly"


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def load_service_account(raw=None):
    """Charge le service account depuis l'env, ou depuis un chemin de fichier."""
    raw = raw or os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON")
    if not raw:
        sys.exit(
            "GOOGLE_SERVICE_ACCOUNT_JSON manquant.\n"
            "Valeur attendue : le JSON complet de la cle du service account, "
            "ou un chemin vers ce fichier."
        )
    candidate = os.path.expanduser(raw.strip())
    if len(candidate) < 4096 and os.path.exists(candidate):  # tolere un chemin de fichier
        with open(candidate) as handle:
            raw = handle.read()
    account = json.loads(raw)
    account["private_key"] = account["private_key"].replace("\\n", "\n")
    return account


def sheet_id(explicit=None) -> str:
    value = explicit or os.environ.get("GOOGLE_SHEETS_ID")
    if not value:
        sys.exit("GOOGLE_SHEETS_ID manquant (l'ID entre /d/ et /edit dans l'URL).")
    return value


def access_token(account, scope=SCOPE_SHEETS) -> str:
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp())
    header = {"alg": "RS256", "typ": "JWT"}
    claims = {
        "iss": account["client_email"],
        "scope": scope,
        "aud": TOKEN_URL,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = "{}.{}".format(
        _b64url(json.dumps(header, separators=(",", ":")).encode()),
        _b64url(json.dumps(claims, separators=(",", ":")).encode()),
    ).encode("ascii")

    with tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False) as key_file:
        key_file.write(account["private_key"])
        key_path = key_file.name
    try:
        signature = subprocess.run(
            ["openssl", "dgst", "-sha256", "-sign", key_path],
            input=signing_input,
            capture_output=True,
            check=True,
        ).stdout
    except FileNotFoundError:
        sys.exit("openssl introuvable — requis pour signer le JWT.")
    except subprocess.CalledProcessError as exc:
        sys.exit("Signature openssl echouee : " + exc.stderr.decode(errors="replace"))
    finally:
        os.unlink(key_path)

    assertion = signing_input.decode("ascii") + "." + _b64url(signature)
    body = urllib.parse.urlencode(
        {"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion}
    ).encode()

    try:
        with urllib.request.urlopen(urllib.request.Request(TOKEN_URL, data=body)) as resp:
            return json.load(resp)["access_token"]
    except urllib.error.HTTPError as exc:
        sys.exit(
            "Google refuse le service account ({}) : {}\n"
            "Causes possibles : cle revoquee, projet GCP supprime, "
            "ou service account efface.".format(exc.code, exc.read().decode(errors="replace"))
        )


def api(token, url, method="GET", payload=None):
    """Appel REST Google. Retourne (ok, corps_json_ou_message_erreur)."""
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Authorization": "Bearer " + token}
    if data:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as resp:
            raw = resp.read()
            return True, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")
        try:
            detail = json.loads(detail)["error"]["message"]
        except Exception:
            pass
        return False, "HTTP {} — {}".format(exc.code, detail)
    except urllib.error.URLError as exc:
        return False, "Reseau : {}".format(exc.reason)
