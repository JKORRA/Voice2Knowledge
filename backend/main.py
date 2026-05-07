import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.api.routes import router as api_router
from backend.api.websocket import router as ws_router
from backend.core.model_manager import model_manager
from backend.core.llm_manager import llm_manager
from backend.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure default model is downloaded
    # (Normally handled by the launcher splash screen, but good to ensure here)
    if not model_manager.is_model_downloaded(settings.default_model):
        logger.info(f"Default model '{settings.default_model}' not found locally. Downloading...")
        # Since we might block startup, this is a fallback.
        await model_manager.download_model_async(settings.default_model)
    else:
        logger.info(f"Default model '{settings.default_model}' is already cached.")
        
    if not llm_manager.is_model_downloaded():
        logger.info(f"LLM model '{llm_manager.repo_id}' not found locally. Downloading...")
        await llm_manager.download_model_async()
    else:
        logger.info(f"LLM model '{llm_manager.repo_id}' is already cached.")
        
    yield
    # Shutdown: cleanup temp files
    logger.info("Shutting down... cleaning up temp files.")
    temp_dir = settings.output_dir / "temp_uploads"
    if temp_dir.exists():
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except Exception as e:
            logger.error(f"Failed to clean up temp directory: {e}")

app = FastAPI(title="Voice2Knowledge API", lifespan=lifespan)

# Allow CORS for development (React dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
app.include_router(ws_router)

# Mount frontend static files
# We will create frontend/dist later during build phase
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
else:
    logger.warning("Frontend dist directory not found. API only mode.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
