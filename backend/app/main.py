from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.api_v1.api import api_router


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

# Set up CORS - allowing frontend on different ports and public tunnel
import os
PUBLIC_FRONTEND_URL = os.getenv("PUBLIC_FRONTEND_URL", "")
PUBLIC_BACKEND_URL = os.getenv("PUBLIC_BACKEND_URL", "")

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001", 
    "http://localhost:3002",
    "https://julie-continue-constructed-need.trycloudflare.com",  # Frontend tunnel URL
]

# Add environment-specific tunnel URLs
if PUBLIC_FRONTEND_URL:
    allowed_origins.append(PUBLIC_FRONTEND_URL)
if PUBLIC_BACKEND_URL:
    # Allow backend to accept requests from its own URL for internal calls
    allowed_origins.append(PUBLIC_BACKEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "valuerpro-backend"}