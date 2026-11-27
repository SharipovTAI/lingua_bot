"""Запуск подготовленной демонстрации и открытие браузера."""

import json
from pathlib import Path
import subprocess
import sys
import time
from urllib.request import urlopen
import webbrowser

ROOT = Path(__file__).resolve().parent
URL = "http://127.0.0.1:8000"


def ready():
    try:
        with urlopen(URL + "/api/v1/health/", timeout=1) as response:
            data = json.load(response)
        return (
            data.get("service") == "linguabot-backend" and data.get("stage") == "week-5"
        )
    except (OSError, ValueError):
        return False


if not (ROOT / "frontend/dist/index.html").exists():
    sys.exit("Сначала выполните python setup_demo.py.")
if not ready():
    runtime = ROOT / ".runtime"
    runtime.mkdir(exist_ok=True)
    with (
        (runtime / "demo-out.log").open("a") as out,
        (runtime / "demo-error.log").open("a") as err,
    ):
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "serve_demo.py")],
            cwd=ROOT,
            stdout=out,
            stderr=err,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    for _ in range(30):
        if ready():
            break
        if process.poll() is not None:
            sys.exit(
                "Сервер не запустился. Проверьте .runtime/demo-error.log и порт 8000."
            )
        time.sleep(0.5)
    else:
        sys.exit("Не удалось дождаться сервера. Проверьте .runtime/demo-error.log.")
webbrowser.open(URL)
print("Сайт работает: " + URL)
