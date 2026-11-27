"""Подготовка проекта на компьютере с Python и Node.js."""

from pathlib import Path
import os
import shutil
import subprocess
import sys
import venv

ROOT = Path(__file__).resolve().parent
python = ROOT / (".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python")
if not python.exists():
    venv.EnvBuilder(with_pip=True).create(ROOT / ".venv")
subprocess.run(
    [str(python), "-m", "pip", "install", "-r", "requirements.txt"],
    cwd=ROOT,
    check=True,
)
npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
if not npm:
    sys.exit("Установите Node.js и повторите подготовку.")
for arguments in [["ci"], ["run", "build"]]:
    subprocess.run([npm, *arguments], cwd=ROOT / "frontend", check=True)
for arguments in [
    ["migrate"],
    ["seed_scenarios"],
    ["seed_exercises"],
    ["seed_demo"],
    ["collectstatic", "--noinput"],
]:
    subprocess.run([str(python), "manage.py", *arguments], cwd=ROOT, check=True)
print("Готово. Запустите start-demo.cmd или .venv/Scripts/python.exe start_demo.py.")
