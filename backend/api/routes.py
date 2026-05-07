import os
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

AVAILABLE_MODELS = ['tiny', 'base', 'small', 'medium', 'large-v3']

@router.get("/models")
async def get_models():
    from backend.core.model_manager import model_manager
    models_status = []
    for model in AVAILABLE_MODELS:
        is_downloaded = model_manager.is_model_downloaded(model)
        models_status.append({
            "name": model,
            "downloaded": is_downloaded
        })
    return {"models": models_status, "default": settings.default_model}

@router.post("/models/download")
async def download_model(model: str = Query(..., pattern='^(tiny|base|small|medium|large-v3)$')):
    from backend.core.model_manager import model_manager
    try:
        await model_manager.download_model_async(model)
        return {"status": "downloaded", "model": model}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")

@router.delete("/models/{model_name}")
async def delete_model(model_name: str):
    try:
        model_path = Path(settings.output_dir).parent / "huggingface" / "hub"
        if model_path.exists():
            import shutil
            model_dir = model_path / f"models--Systran--faster-whisper-{model_name}"
            if model_dir.exists():
                shutil.rmtree(model_dir)
                return {"status": "deleted", "model": model_name}
        return {"status": "not_found", "model": model_name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
