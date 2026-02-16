import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config.settings import settings
from app.api.v1.router import api_router
from app.core.exceptions import GrowMoreException
from app.scrapers.scheduler import get_scheduler
from app.logging.middleware import setup_request_logging


logging.basicConfig(
    level=getattr(logging, settings.log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Debug: Print CORS origins on startup
print(f"CORS Origins configured: {settings.cors_origins}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.app_name}...")

    # Start scheduler based on ENABLE_SCHEDULER env var (defaults to True in production)
    enable_scheduler = getattr(settings, 'enable_scheduler', settings.is_production)
    if enable_scheduler:
        scheduler = get_scheduler()
        scheduler.start()
        logger.info("Scraper scheduler started")
    else:
        logger.info("Scraper scheduler disabled. Run manually with: python scripts/run_scrapers.py")

    yield

    if enable_scheduler:
        scheduler = get_scheduler()
        scheduler.stop()
        logger.info("Scraper scheduler stopped")

    logger.info(f"Shutting down {settings.app_name}...")


app = FastAPI(
    title=settings.app_name,
    description="Multi-asset investment platform API for Pakistan market",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS: list all allowed origins (wildcard "*" doesn't work with credentials)
cors_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://grow-more-ai.web.app",
    "https://grow-more-ai.firebaseapp.com",
] + [o for o in settings.cors_origins if o != "*"]
print(f"Using CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware (must be added after CORS)
setup_request_logging(app)


@app.exception_handler(GrowMoreException)
async def growmore_exception_handler(request: Request, exc: GrowMoreException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected error occurred"},
    )


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.app_env,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
