from __future__ import annotations

import hashlib
import io
from pathlib import Path

from PIL import Image, ImageOps

from .publish import atomic_write, mall_dir

Image.MAX_IMAGE_PIXELS = 40_000_000  # acima disso o Pillow recusa (proteção contra "bomba de descompressão")
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
MAX_SIDE = 2048


class ImageRejected(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def process_floor_image(raw: bytes) -> tuple[bytes, int, int]:
    """Valida, normaliza (orientação EXIF, ≤2048px) e converte para WebP."""
    try:
        with Image.open(io.BytesIO(raw)) as probe:
            probe.verify()
        im = Image.open(io.BytesIO(raw))
        fmt = im.format
        if fmt not in ALLOWED_FORMATS:
            raise ImageRejected("IMAGE_FORMAT", "Envie PNG, JPEG ou WebP")
        im = ImageOps.exif_transpose(im)
        im.load()
    except ImageRejected:
        raise
    except Exception as exc:  # noqa: BLE001 - qualquer falha de decodificação vira rejeição amigável
        raise ImageRejected("IMAGE_INVALID", "Arquivo de imagem inválido ou corrompido") from exc

    if im.width < 200 or im.height < 200:
        raise ImageRejected("IMAGE_TOO_SMALL", "Planta pequena demais (mínimo 200x200 px)")
    im.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA" if "transparency" in im.info or im.mode in ("LA", "P") else "RGB")
    out = io.BytesIO()
    im.save(out, format="WEBP", quality=85, method=4)
    return out.getvalue(), im.width, im.height


def store_floor_image(public_dir: Path, mall_id: str, webp: bytes) -> str:
    """O nome do arquivo é o hash do conteúdo: nunca vem do usuário e permite cache imutável."""
    name = hashlib.sha256(webp).hexdigest()[:16] + ".webp"
    atomic_write(mall_dir(public_dir, mall_id) / "floors" / name, webp)
    return f"/p/{mall_id}/floors/{name}"
