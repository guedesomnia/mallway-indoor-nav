"""Servidor de desenvolvimento: `python server/dev.py` (usa SQLite local e ./public_out, nada de produção)."""
import os
import pathlib
import sys

os.chdir(pathlib.Path(__file__).resolve().parent)
sys.path.insert(0, ".")

import uvicorn  # noqa: E402

if __name__ == "__main__":
    uvicorn.run("app.main:get_app", factory=True, host="127.0.0.1", port=8000)
