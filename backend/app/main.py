from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.api_v1.api import api_router
from app.api.simple_monitoring import router as monitoring_router
from app.api.optimization import router as optimization_router
from app.api.production_integration import router as production_router
from app.api.maintenance import router as maintenance_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="ValuerPro API",
    description="AI-Powered Property Valuation Report System",
    version="0.1.0",
    lifespan=lifespan
)

# Set up CORS - allowing frontend on different ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")
app.include_router(monitoring_router)
app.include_router(optimization_router)
app.include_router(production_router)
app.include_router(maintenance_router)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "valuerpro-backend"}