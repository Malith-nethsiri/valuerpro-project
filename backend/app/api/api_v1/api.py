from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.api_v1.endpoints import auth, reports, uploads, ai, ocr, batch_ocr, maps, jobs, regulations, location
from app.db import get_db, test_database_connection

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(ai.router, prefix="/ai", tags=["ai"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
api_router.include_router(batch_ocr.router, prefix="/batch-ocr", tags=["batch-ocr"])
api_router.include_router(maps.router, prefix="/maps", tags=["maps"])
api_router.include_router(location.router, prefix="/location", tags=["location"])
api_router.include_router(regulations.router, prefix="/regulations", tags=["regulations"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["background-jobs"])


@api_router.get("/healthz")
async def healthz():
    """Health check endpoint for monitoring"""
    return {"ok": True}


@api_router.get("/health/db")
async def health_database():
    """Database connectivity health check"""
    db_connected = test_database_connection()
    return {
        "database_connected": db_connected,
        "status": "healthy" if db_connected else "unhealthy"
    }