"""Единый сервер демоверсии: собранный React, Django API и SQLite."""

import os
from pathlib import Path
import secrets

ROOT = Path(__file__).resolve().parent
runtime = ROOT / ".runtime"
runtime.mkdir(exist_ok=True)
secret_file = runtime / "demo-secret.txt"
if not secret_file.exists():
    secret_file.write_text(secrets.token_urlsafe(48), encoding="utf-8")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
os.environ.setdefault("DJANGO_DEBUG", "false")
os.environ.setdefault(
    "DJANGO_SECRET_KEY", secret_file.read_text(encoding="utf-8").strip()
)
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")

from config.wsgi import application
from waitress import serve

if __name__ == "__main__":
    serve(
        application,
        host=os.getenv("LINGUABOT_HOST", "127.0.0.1"),
        port=int(os.getenv("LINGUABOT_PORT", "8000")),
        threads=6,
    )
