from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from python_multipart import MultipartParser
from python_multipart.multipart import parse_options_header
from sqlalchemy.orm import Session

from app import storage
from app.config import get_settings
from app.db import get_db
from app.models import User, WardrobeItem
from app.schemas import WardrobeItemResponse
from app.security import get_current_user

router = APIRouter(prefix="/api/wardrobe", tags=["images"])

MAX_IMAGE_SIZE = 5 * 1024 * 1024
_MAX_MULTIPART_OVERHEAD = 64 * 1024

_JPEG_SIG = b"\xff\xd8\xff"
_PNG_SIG = b"\x89PNG\r\n\x1a\n"
_RIFF_SIG = b"RIFF"
_WEBP_SIG = b"WEBP"

_bearer_scheme = HTTPBearer()


class _UploadTooLargeError(Exception):
    """Internal signal raised mid-stream when the file part exceeds the cap."""


def _parse_header_value(value: str) -> tuple[str, dict[str, str]]:
    """Parse an RFC-2231-style header into (main value, {param: value}).

    ``parse_options_header`` returns bytes on recent python-multipart versions and
    str on older ones; normalize both to str so the caller is version-agnostic.
    """
    parsed, params = parse_options_header(value)
    main = parsed.decode("latin-1") if isinstance(parsed, bytes) else parsed
    normalized: dict[str, str] = {}
    for key, val in params.items():
        k = key.decode("latin-1") if isinstance(key, bytes) else key
        v = val.decode("latin-1") if isinstance(val, bytes) else val
        normalized[k] = v
    return main, normalized


def _detect_image(content: bytes) -> tuple[str, str] | None:
    """Return (extension, media_type) for a recognized image, otherwise None."""
    if content.startswith(_JPEG_SIG):
        return "jpg", "image/jpeg"
    if content.startswith(_PNG_SIG):
        return "png", "image/png"
    if content.startswith(_RIFF_SIG) and content[8:12] == _WEBP_SIG:
        return "webp", "image/webp"
    return None


def _current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    return get_current_user(credentials, db)


def _content_length_too_large(request: Request) -> bool:
    """True when the declared Content-Length already exceeds the size limit.

    Checked before any body bytes are read so an oversized upload is rejected
    without buffering its body. The multipart framing overhead is tolerated so a
    file of exactly 5 MB is not falsely rejected.
    """
    header = request.headers.get("content-length")
    if header is None:
        return False
    try:
        length = int(header)
    except ValueError:
        return False
    return length > MAX_IMAGE_SIZE + _MAX_MULTIPART_OVERHEAD


async def _read_upload(request: Request) -> bytes:
    """Stream the multipart body and return the bytes of its ``file`` part.

    The body is read chunk by chunk; as soon as the file part exceeds
    ``MAX_IMAGE_SIZE`` the remainder of the body is left unread and a 413 is
    raised.
    """
    content_type = request.headers.get("content-type", "")
    _, ctype_params = _parse_header_value(content_type)
    boundary = ctype_params.get("boundary")
    if not boundary:
        raise HTTPException(status_code=400, detail="expected multipart/form-data")

    state: dict[str, object] = {
        "field_name": None,
        "header_field": b"",
        "header_value": b"",
        "data": bytearray(),
    }

    def on_part_begin() -> None:
        state["field_name"] = None

    def on_header_begin() -> None:
        state["header_field"] = b""
        state["header_value"] = b""

    def on_header_field(data: bytes, start: int, end: int) -> None:
        state["header_field"] += data[start:end]

    def on_header_value(data: bytes, start: int, end: int) -> None:
        state["header_value"] += data[start:end]

    def on_header_end() -> None:
        if state["header_field"].lower() == b"content-disposition":
            _, params = _parse_header_value(state["header_value"].decode("latin-1"))
            state["field_name"] = params.get("name")

    def on_part_data(data: bytes, start: int, end: int) -> None:
        if state["field_name"] == "file":
            state["data"] += data[start:end]
            if len(state["data"]) > MAX_IMAGE_SIZE:
                raise _UploadTooLargeError

    parser = MultipartParser(
        boundary=boundary,
        callbacks={
            "on_part_begin": on_part_begin,
            "on_header_begin": on_header_begin,
            "on_header_field": on_header_field,
            "on_header_value": on_header_value,
            "on_header_end": on_header_end,
            "on_part_data": on_part_data,
        },
    )

    try:
        async for chunk in request.stream():
            parser.write(chunk)
    except _UploadTooLargeError:
        raise HTTPException(status_code=413, detail="image exceeds the 5 MB size limit") from None

    return bytes(state["data"])


@router.post("/{item_id}/image", response_model=WardrobeItemResponse, status_code=201)
async def upload_image(
    item_id: int,
    request: Request,
    user: User = Depends(_current_user),
    db: Session = Depends(get_db),
) -> WardrobeItem:
    if _content_length_too_large(request):
        raise HTTPException(status_code=413, detail="image exceeds the 5 MB size limit")

    item = db.get(WardrobeItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="item not found")
    if item.owner_id != user.id:
        raise HTTPException(status_code=403, detail="item does not belong to you")

    content = await _read_upload(request)

    detected = _detect_image(content)
    if detected is None:
        raise HTTPException(
            status_code=415, detail="unsupported image type (JPEG, PNG or WebP only)"
        )

    ext, _media_type = detected
    filename = storage.save_image(get_settings().upload_dir, item.id, content, ext)
    item.image_filename = filename
    db.commit()
    db.refresh(item)
    return item


@router.get("/{item_id}/image")
async def get_image(
    item_id: int,
    user: User = Depends(_current_user),
    db: Session = Depends(get_db),
) -> Response:
    item = db.get(WardrobeItem, item_id)
    if item is None or item.owner_id != user.id:
        raise HTTPException(status_code=404, detail="item not found")
    if not item.image_filename:
        raise HTTPException(status_code=404, detail="no image uploaded")

    path = Path(get_settings().upload_dir) / item.image_filename
    if not path.is_file():
        raise HTTPException(status_code=404, detail="image missing")

    content = path.read_bytes()
    detected = _detect_image(content)
    media_type = detected[1] if detected else "application/octet-stream"
    return Response(content=content, media_type=media_type)
