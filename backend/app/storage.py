from pathlib import Path


def save_image(upload_dir: str, item_id: int, content: bytes, ext: str) -> str:
    """Persist an uploaded image and return the stored filename."""
    directory = Path(upload_dir)
    directory.mkdir(parents=True, exist_ok=True)

    filename = f"{item_id}.{ext}"
    path = directory / filename
    path.write_bytes(content)
    return filename


def delete_image(upload_dir: str, filename: str) -> None:
    """Remove a previously stored image, if present."""
    if not filename:
        return

    path = Path(upload_dir) / filename
    if path.is_file():
        path.unlink()
