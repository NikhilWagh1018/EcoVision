import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analytics, public, reports, spots
from .storage import restore_photo

app = FastAPI(title="EcoVision AI API", version="0.1.0")
LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"]
origins = LOCAL_ORIGINS + [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=settings.cors_origin_regex or None,
                   allow_methods=["*"], allow_headers=["*"])
os.makedirs(settings.storage_dir, exist_ok=True)
app.include_router(reports.router)
app.include_router(spots.router)
app.include_router(public.router)
app.include_router(analytics.router)


@app.get("/media/{rel_path:path}")  # TODO: protect with auth
def media(rel_path: str):
    """Serve a photo from disk, or from its database copy after a restart wiped the disk."""
    root = os.path.realpath(settings.storage_dir)
    path = os.path.realpath(os.path.join(root, rel_path))
    if os.path.commonpath([root, path]) != root:
        raise HTTPException(404, "not found")
    if not restore_photo(path):
        raise HTTPException(404, "not found")
    return FileResponse(path)


@app.get("/health")
def health():
    return {"status": "ok"}
