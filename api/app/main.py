import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analytics, public, reports, spots

app = FastAPI(title="EcoVision AI API", version="0.1.0")
LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"]
origins = LOCAL_ORIGINS + [o.strip().rstrip("/") for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_origin_regex=settings.cors_origin_regex or None,
                   allow_methods=["*"], allow_headers=["*"])
os.makedirs(settings.storage_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.storage_dir), name="media")  # TODO: protect with auth
app.include_router(reports.router)
app.include_router(spots.router)
app.include_router(public.router)
app.include_router(analytics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
