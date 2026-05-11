import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse

from backend.core.config import settings
from backend.core.database import db

router = APIRouter()

TEMP_DIR = settings.output_dir / "temp_uploads"
TEMP_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    session_id = str(uuid.uuid4())
    saved_files = []
    
    for file in files:
        if not file.filename:
            continue
            
        # Basic extension check
        ext = Path(file.filename).suffix.lower()
        if ext not in {'.wav', '.mp3', '.m4a', '.flac', '.ogg', '.webm', '.mp4'}:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")
            
        dest_path = TEMP_DIR / f"{uuid.uuid4()}_{file.filename}"
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        saved_files.append(str(dest_path))
        
    return {"session_id": session_id, "files": saved_files}

@router.get("/download")
async def download_file(path: str):
    file_path = Path(path)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    # Prevent directory traversal
    if not str(file_path.resolve()).startswith(str(settings.output_dir.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
        
    return FileResponse(path=file_path, filename=file_path.name)

@router.get("/settings")
async def get_settings():
    return {
        "default_model": settings.default_model,
        "default_language": settings.default_language,
        "default_device": settings.default_device,
        "default_compute_type": settings.default_compute_type,
        "output_dir": str(settings.output_dir),
    }

@router.get("/history")
async def get_history(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
):
    transcriptions = db.get_transcriptions(limit=limit, offset=offset, search=search)
    total = db.get_transcription_count(search=search)
    return {
        "transcriptions": transcriptions,
        "total": total,
        "limit": limit,
        "offset": offset,
    }

@router.get("/history/{transcription_id}")
async def get_transcription(transcription_id: int):
    transcription = db.get_transcription(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return transcription

@router.delete("/history/{transcription_id}")
async def delete_transcription(transcription_id: int):
    success = db.delete_transcription(transcription_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return {"status": "deleted", "id": transcription_id}

@router.get("/export/{transcription_id}")
async def export_transcription(
    transcription_id: int,
    format: str = Query('txt', regex='^(txt|pdf|docx)$'),
):
    transcription = db.get_transcription(transcription_id)
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    if not transcription.get('text_content'):
        raise HTTPException(status_code=400, detail="No text content to export")

    from backend.core.exporter import export_content
    content = transcription['text_content']
    filename = f"{Path(transcription['filename']).stem}.{format}"

    try:
        export_bytes = export_content(content, format, filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

    from fastapi.responses import Response
    return Response(
        content=export_bytes,
        media_type=f'application/{format}',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'}
    )

@router.get("/setup/status")
async def get_setup_status():
    from backend.core.model_manager import model_manager
    from backend.core.llm_manager import llm_manager
    from backend.core.config import settings

    whisper_ready = model_manager.is_model_downloaded(settings.default_model)
    llm_ready = llm_manager.is_model_downloaded()

    return {
        "is_ready": whisper_ready and llm_ready,
        "whisper_ready": whisper_ready,
        "llm_ready": llm_ready,
    }

from backend.core.model_cache_manager import (
    AVAILABLE_MODELS,
    AVAILABLE_CHAT_MODELS,
    delete_cached_model,
    get_cached_models,
)

@router.get("/models")
async def get_models():
    from backend.core.model_manager import model_manager
    from backend.core.llm_manager import llm_manager
    
    models_status = []
    for model in AVAILABLE_MODELS:
        is_downloaded = model_manager.is_model_downloaded(model)
        models_status.append({
            "name": model,
            "type": "transcription",
            "downloaded": is_downloaded
        })
        
    for model in AVAILABLE_CHAT_MODELS:
        is_downloaded = llm_manager.is_model_downloaded(model)
        models_status.append({
            "name": model,
            "type": "chat",
            "downloaded": is_downloaded
        })
        
    return {"models": models_status, "default": settings.default_model, "default_chat": settings.default_model}

@router.post("/models/download")
async def download_model(model: str = Query(...)):
    from backend.core.model_manager import model_manager
    from backend.core.llm_manager import llm_manager

    try:
        if model in AVAILABLE_MODELS:
            await model_manager.download_model_async(model)
            return {"status": "downloaded", "model": model, "type": "transcription"}
        elif model in AVAILABLE_CHAT_MODELS:
            await llm_manager.download_model_async(model)
            return {"status": "downloaded", "model": model, "type": "chat"}
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    try:
        if model_name in AVAILABLE_MODELS:
            from backend.core.transcriber import transcriber_instance
            await transcriber_instance.unload_model()
            deleted = delete_cached_model(model_name, "transcription")
        elif model_name in AVAILABLE_CHAT_MODELS:
            from backend.core.llm_manager import llm_manager
            await llm_manager.unload_model()
            deleted = delete_cached_model(model_name, "chat")
        else:
            raise HTTPException(status_code=400, detail=f"Unknown model: {model_name}")

        if deleted:
            return {"status": "deleted", "model": model_name}
        return {"status": "not_found", "model": model_name}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
