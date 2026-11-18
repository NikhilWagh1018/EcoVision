import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import analytics, public, reports, spots

app = FastAPI(title="EcoVision AI API", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"],
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
