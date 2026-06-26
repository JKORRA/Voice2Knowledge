import asyncio
import threading
import logging
from pathlib import Path
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict

from backend.core.transcriber import transcriber_instance
from backend.core.llm_manager import llm_manager
from backend.core.state import app_state
from backend.core.config import settings
from backend.core.database import db

logger = logging.getLogger(__name__)

router = APIRouter()

active_sessions: Dict[str, threading.Event] = {}

@router.websocket("/ws/setup")
async def setup_ws(websocket: WebSocket):
    await websocket.accept()
    from backend.core.model_manager import model_manager
    from backend.core.llm_manager import llm_manager
    from backend.core.config import settings

    whisper_ready = model_manager.is_model_downloaded(settings.default_model)
    llm_ready = llm_manager.is_model_downloaded()

    if whisper_ready and llm_ready:
        await websocket.send_json({"type": "done"})
        await websocket.close()
        return

    progress_queue = asyncio.Queue()

    async def queue_forwarder():
        while True:
            try:
                msg = await progress_queue.get()
                await websocket.send_json(msg)
                if msg.get("type") in ["error", "done"]:
                    break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Queue forwarder error: {e}")
                break

    forwarder_task = asyncio.create_task(queue_forwarder())

    try:
        loop = asyncio.get_running_loop()
        if not whisper_ready:
            def whisper_cb(pct):
                loop.call_soon_threadsafe(progress_queue.put_nowait, {
                    "type": "progress",
                    "component": "whisper",
                    "percent": pct,
                    "message": f"Downloading Transcription Model (Whisper {settings.default_model})"
                })
            
            progress_queue.put_nowait({
                "type": "progress",
                "component": "whisper",
                "percent": 0,
                "message": f"Starting Download: Transcription Model (Whisper {settings.default_model})"
            })
            await model_manager.download_model_async(settings.default_model, progress_callback=whisper_cb)

        if not llm_ready:
            def llm_cb(pct):
                loop.call_soon_threadsafe(progress_queue.put_nowait, {
                    "type": "progress",
                    "component": "llm",
                    "percent": pct,
                    "message": f"Downloading AI Chat Model ({llm_manager.repo_id.split('/')[-1]})"
                })
            
            progress_queue.put_nowait({
                "type": "progress",
                "component": "llm",
                "percent": 0,
                "message": f"Starting Download: AI Chat Model ({llm_manager.repo_id.split('/')[-1]})"
            })
            await llm_manager.download_model_async(progress_callback=llm_cb)

        progress_queue.put_nowait({"type": "done"})
    except Exception as e:
        logger.error(f"Error in setup websocket: {e}")
        progress_queue.put_nowait({"type": "error", "message": str(e)})
    finally:
        await forwarder_task
        try:
            await websocket.close()
        except:
            pass

def get_device_info():
    """Determine device and compute type with error handling."""
    try:
        from backend.core.gpu_utils import is_cuda_available, get_cuda_device_name
        cuda_available = is_cuda_available()
        cuda_device_name = get_cuda_device_name() if cuda_available else None
        return {
            "cuda_available": cuda_available,
            "cuda_device_name": cuda_device_name,
        }
    except Exception as e:
        logger.warning(f"Could not detect GPU: {e}")
        return {
            "cuda_available": False,
            "cuda_device_name": None,
            "error": str(e)
        }

@router.websocket("/ws/download/{model_type}/{model_name}")
async def download_model_ws(websocket: WebSocket, model_type: str, model_name: str):
    await websocket.accept()
    from backend.core.model_manager import model_manager
    from backend.core.llm_manager import llm_manager

    progress_queue = asyncio.Queue()

    async def queue_forwarder():
        while True:
            try:
                msg = await progress_queue.get()
                await websocket.send_json(msg)
                if msg.get("type") in ["error", "done"]:
                    break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Queue forwarder error: {e}")
                break

    forwarder_task = asyncio.create_task(queue_forwarder())

    try:
        loop = asyncio.get_running_loop()
        def cb(pct):
            loop.call_soon_threadsafe(progress_queue.put_nowait, {
                "type": "progress",
                "percent": pct
            })

        if model_type == "whisper":
            if not model_manager.is_model_downloaded(model_name):
                progress_queue.put_nowait({"type": "progress", "percent": 0})
                await model_manager.download_model_async(model_name, progress_callback=cb)
        elif model_type == "chat":
            if not llm_manager.is_model_downloaded(model_name):
                progress_queue.put_nowait({"type": "progress", "percent": 0})
                await llm_manager.download_model_async(model_name, progress_callback=cb)
        else:
            raise ValueError(f"Unknown model type: {model_type}")

        progress_queue.put_nowait({"type": "done"})
    except Exception as e:
        logger.error(f"Error in download websocket: {e}")
        progress_queue.put_nowait({"type": "error", "message": str(e)})
    finally:
        await forwarder_task
        try:
            await websocket.close()
        except:
            pass

@router.websocket("/ws/transcribe/{session_id}")
async def transcribe_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    if not app_state.start_transcription():
        await websocket.send_json({"type": "error", "message": "System is currently busy generating an answer. Please wait."})
        await websocket.close()
        return

    # Unload LLM if it's currently loaded
    await llm_manager.unload_model()

    cancel_event = threading.Event()
    active_sessions[session_id] = cancel_event

    progress_queue: asyncio.Queue = asyncio.Queue()

    async def queue_forwarder():
        """Reads from queue and forwards to WebSocket - runs in async context"""
        while True:
            try:
                msg = await progress_queue.get()
                await websocket.send_json(msg)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Queue forwarder error: {e}")
                break

    forwarder_task = asyncio.create_task(queue_forwarder())

    try:
        data = await websocket.receive_json()
        files = data.get("files", [])
        model_size = data.get("model", settings.default_model)
        language = data.get("language")
        if language == "auto" or not language:
            language = None
        device = data.get("device", settings.default_device)
        compute_type = data.get("compute_type", settings.default_compute_type)
        beam_size = data.get("beam_size", settings.default_beam_size)

        # Validate files exist
        valid_files = []
        for file_path in files:
            if not Path(file_path).exists():
                await websocket.send_json({
                    "type": "error",
                    "file": file_path,
                    "message": f"File not found: {Path(file_path).name}"
                })
            else:
                valid_files.append(file_path)

        if not valid_files:
            await websocket.send_json({
                "type": "error",
                "message": "No valid files to transcribe."
            })
            return

        # Get device info
        device_info = get_device_info()

        if device == "auto":
            actual_device = "cuda" if device_info["cuda_available"] else "cpu"
        else:
            actual_device = device

        if compute_type == "auto":
            actual_compute_type = "float16" if actual_device == "cuda" else "int8"
        else:
            actual_compute_type = compute_type

        # Send device info to client
        await websocket.send_json({
            "type": "device_info",
            "device": actual_device,
            "compute_type": actual_compute_type,
            "cuda_available": device_info["cuda_available"],
            "cuda_device_name": device_info.get("cuda_device_name"),
        })

        from backend.core.model_manager import model_manager
        if not model_manager.is_model_downloaded(model_size):
            await websocket.send_json({
                "type": "error",
                "message": f"Transcription model '{model_size}' is not downloaded. Please download it from Settings first."
            })
            return

        loop = asyncio.get_running_loop()
        for file_path in valid_files:
            if cancel_event.is_set():
                break

            filename = Path(file_path).name
            await websocket.send_json({
                "type": "progress",
                "file": filename,
                "percent": 0,
                "message": f"Starting {filename}..."
            })

            def progress_callback(percent, partial_text):
                loop.call_soon_threadsafe(progress_queue.put_nowait, {
                    "type": "progress",
                    "file": filename,
                    "percent": percent,
                    "partial": partial_text
                })

            try:
                clean_txt, metadata = await transcriber_instance.transcribe(
                    audio_path=file_path,
                    output_dir=str(settings.output_dir),
                    model_size=model_size,
                    language=language,
                    device=actual_device,
                    compute_type=actual_compute_type,
                    beam_size=beam_size,
                    progress_callback=progress_callback,
                    cancel_event=cancel_event
                )
            except Exception as transcription_error:
                logger.error(f"Transcription error for {file_path}: {transcription_error}")
                await websocket.send_json({
                    "type": "error",
                    "file": file_path,
                    "message": f"Transcription failed: {str(transcription_error)}"
                })
                continue

            if cancel_event.is_set():
                await websocket.send_json({
                    "type": "cancelled",
                    "file": file_path
                })
            else:
                if clean_txt:
                    try:
                        with open(clean_txt, "r", encoding="utf-8") as f:
                            text_content = f.read()

                        # Save to database
                        filename = Path(file_path).name
                        db.add_transcription(
                            session_id=session_id,
                            filename=filename,
                            file_path=file_path,
                            text_content=text_content,
                            model_size=model_size,
                            language=metadata.get("language", language) if metadata else language,
                            device=actual_device,
                            duration_seconds=metadata.get("duration") if metadata else None,
                        )

                        db.ensure_session(session_id)

                        await websocket.send_json({
                            "type": "result",
                            "text": text_content,
                            "file": filename
                        })
                    except Exception as e:
                        logger.error(f"Error reading transcription output: {e}")
                        await websocket.send_json({
                            "type": "error",
                            "file": file_path,
                            "message": "Transcription completed but could not read output."
                        })
                else:
                    await websocket.send_json({
                        "type": "error",
                        "file": file_path,
                        "message": "Transcription failed or returned no output."
                    })

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
        cancel_event.set()
    except Exception as e:
        logger.error(f"Error in websocket transcription: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass
    finally:
        forwarder_task.cancel()
        try:
            await forwarder_task
        except asyncio.CancelledError:
            pass
        active_sessions.pop(session_id, None)
        await transcriber_instance.unload_model()
        app_state.end_transcription()
        try:
            await websocket.close()
        except Exception:
            pass

@router.websocket("/ws/chat/{session_id}")
async def chat_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    if not app_state.start_generation():
        await websocket.send_json({"type": "error", "message": "System is currently transcribing. Please wait."})
        await websocket.close()
        return

    # Unload whisper if currently loaded
    await transcriber_instance.unload_model()

    cancel_event = threading.Event()
    active_sessions[f"chat_{session_id}"] = cancel_event

    try:
        data = await websocket.receive_json()
        question = data.get("question", "")
        chat_model = data.get("chat_model", "qwen2.5-3b")
        chat_provider = data.get("chat_provider", "local")
        external_api_base_url = data.get("external_api_base_url", "")
        external_api_key = data.get("external_api_key", "")
        external_api_model = data.get("external_api_model", "")

        session_content = db.get_session_content(session_id)
        if not session_content:
            await websocket.send_json({"type": "error", "message": "No session found."})
            cancel_event.set()
            return
            
        transcriptions = session_content.get("transcriptions", [])
        past_chats = session_content.get("chats", [])
        
        import re
        context_text_parts = []
        for t in transcriptions:
            content = t.get('text_content')
            if content:
                filename = t.get('filename', 'Unknown File')
                clean_filename = re.sub(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_', '', filename, flags=re.IGNORECASE)
                context_text_parts.append(f"--- File: {clean_filename} ---\n{content}")
                
        context_text = "\n\n".join(context_text_parts)
        
        if not context_text:
            await websocket.send_json({"type": "error", "message": "No transcriptions found for this session."})
            cancel_event.set()
            return

        import math
        from collections import Counter
        import re

        # --- Smart Context Allocation Engine ---
        # Simple token estimation heuristic (words * 1.5 approx tokens for safety)
        def estimate_tokens(text: str) -> int:
            if not text: return 0
            return int(len(text.split()) * 1.5)

        MAX_CONTEXT_TOKENS = 8192
        RESPONSE_RESERVE = 1000
        SYSTEM_OVERHEAD = 100 # Approx tokens for system prompt instructions

        full_context_tokens = estimate_tokens(context_text)
        question_tokens = estimate_tokens(question)

        # Calculate available budget for RAG vs History
        available_space_for_context = MAX_CONTEXT_TOKENS - RESPONSE_RESERVE - question_tokens - SYSTEM_OVERHEAD
        MIN_HISTORY_RESERVE = 500 # Leave at least 500 tokens for chat history
        
        target_rag_budget = available_space_for_context - MIN_HISTORY_RESERVE

        if full_context_tokens <= target_rag_budget:
            # Full-Text Bypass: The entire transcript fits comfortably in our RAG budget!
            relevant_context = context_text
            logger.info(f"Smart RAG: Full text bypass used. Context size: {full_context_tokens} tokens")
        else:
            # Dynamic Chunk Scaling
            chunk_token_size = 450 # Approx 300 words * 1.5
            max_chunks = max(3, target_rag_budget // chunk_token_size)
            
            def compute_smart_chunks(q, text, max_k):
                def tokenize(t): return re.findall(r'\w+', t.lower())
                q_tokens = set(tokenize(q))
                
                # Filter out common stop words to prevent false TF-IDF matches on queries like "make me a summary"
                stop_words = {"a", "an", "the", "is", "are", "and", "or", "to", "in", "on", "of", "for", "with", "me", "my", "i", "you", "it", "this", "that", "make", "can", "do", "what", "how", "why"}
                meaningful_q_tokens = q_tokens - stop_words
                
                words = text.split()
                chunk_size = 300
                overlap = 50
                chunks = []
                for i in range(0, len(words), chunk_size - overlap):
                    chunks.append(" ".join(words[i:i + chunk_size]))

                if len(chunks) <= max_k: return text

                if not meaningful_q_tokens: 
                    # Holistic Sampling (No meaningful keyword match)
                    step = len(chunks) / max_k
                    return "\n...\n".join(chunks[int(i*step)] for i in range(max_k))

                df = Counter()
                chunk_tokens = [tokenize(c) for c in chunks]
                for tokens in chunk_tokens:
                    for t in set(tokens).intersection(meaningful_q_tokens): df[t] += 1
                
                N = len(chunks)
                idf = {t: math.log(N / (df[t] + 1)) + 1 for t in df}
                
                scores = []
                for idx, tokens in enumerate(chunk_tokens):
                    score = sum(Counter(tokens)[qt] * idf.get(qt, 0) for qt in meaningful_q_tokens)
                    scores.append((score, idx, chunks[idx])) # Store chronological index
                    
                scores.sort(key=lambda x: x[0], reverse=True)
                
                # If the best score is 0, it means no keywords matched (e.g. they just said "summary")
                if not scores or scores[0][0] == 0:
                    step = len(chunks) / max_k
                    return "\n...\n".join(chunks[int(i*step)] for i in range(max_k))
                
                # Take top max_k chunks and SORT THEM CHRONOLOGICALLY before sending to LLM!
                best_items = scores[:max_k]
                best_items.sort(key=lambda x: x[1])
                return "\n...\n".join(item[2] for item in best_items)

            relevant_context = compute_smart_chunks(question, context_text, max_chunks)
            logger.info(f"Smart RAG: Dynamic chunking used. Max chunks allowed: {max_chunks}")

        system_prompt = f"You are an AI assistant. Answer the user's question using ONLY the provided transcription context. Do not make up answers.\n\nContext:\n{relevant_context}"

        if chat_provider == "local":
            if not llm_manager.is_model_downloaded(chat_model):
                await websocket.send_json({
                    "type": "error",
                    "message": f"Chat model '{chat_model}' is not downloaded. Please download it from Settings first."
                })
                return

        await websocket.send_json({"type": "status", "message": "Thinking..."})

        full_response = ""
        
        system_tokens = estimate_tokens(system_prompt)
        
        # Calculate exactly how much space is left for history after actual RAG allocation
        available_history_tokens = MAX_CONTEXT_TOKENS - RESPONSE_RESERVE - system_tokens - question_tokens
        
        # Build history from newest to oldest within the mathematical budget
        dynamic_history = []
        current_history_tokens = 0
        
        for msg in reversed(past_chats):
            msg_content = msg.get("content", "")
            msg_tokens = estimate_tokens(msg_content)
            
            if current_history_tokens + msg_tokens > available_history_tokens:
                break
                
            dynamic_history.insert(0, msg)
            current_history_tokens += msg_tokens

        logger.info(f"Memory Manager: Packed {len(dynamic_history)} past messages ({current_history_tokens} tokens). System RAG: {system_tokens} tokens. Available History Budget: {available_history_tokens}")
        
        messages_payload = [{"role": "system", "content": system_prompt}]
        for msg in dynamic_history:
            messages_payload.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        messages_payload.append({"role": "user", "content": question})

        import json
        logger.info(f"\n{'='*50}\nFULL LLM PROMPT PAYLOAD:\n{json.dumps(messages_payload, indent=2, ensure_ascii=False)}\n{'='*50}")

        if chat_provider == "external":
            if not external_api_key:
                await websocket.send_json({"type": "error", "message": "External API key is missing. Please configure it in settings."})
                cancel_event.set()
            elif not external_api_model:
                await websocket.send_json({"type": "error", "message": "External model name is missing. Please configure it in settings."})
                cancel_event.set()
            else:
                try:
                    from litellm import acompletion
                    response = await acompletion(
                        model=external_api_model,
                        messages=messages_payload,
                        api_key=external_api_key,
                        base_url=external_api_base_url if external_api_base_url else None,
                        stream=True,
                    )
                    
                    async def process_external_stream():
                        nonlocal full_response
                        async for chunk in response:
                            if cancel_event.is_set():
                                break
                            content = chunk.choices[0].delta.content
                            if content:
                                full_response += content
                                await websocket.send_json({"type": "token", "content": content})
                    
                    stream_task = asyncio.create_task(process_external_stream())
                    
                    while not stream_task.done():
                        try:
                            msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.01)
                            if msg.get("action") == "stop":
                                cancel_event.set()
                        except asyncio.TimeoutError:
                            pass
                        except Exception:
                            cancel_event.set()
                            break
                            
                    await stream_task

                except Exception as e:
                    logger.error(f"External API error: {e}")
                    await websocket.send_json({"type": "error", "message": f"External API error: {str(e)}"})
                    cancel_event.set()
        else:
            async for token in llm_manager.generate_stream(messages_payload, cancel_event, chat_model):
                full_response += token
                await websocket.send_json({"type": "token", "content": token})
                # Also listen for stop commands without blocking
                try:
                    msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.01)
                    if msg.get("action") == "stop":
                        cancel_event.set()
                except asyncio.TimeoutError:
                    pass
                except Exception:
                    break

        if not cancel_event.is_set():
            await websocket.send_json({"type": "done"})
            # Save chat to database
            messages = [
                {"role": "user", "content": question},
                {"role": "assistant", "content": full_response},
            ]
            db.save_chat_session(session_id, chat_model if chat_provider == "local" else external_api_model, messages)
            db.ensure_session(session_id)

    except WebSocketDisconnect:
        logger.info(f"Chat WebSocket disconnected for session {session_id}")
        cancel_event.set()
    except Exception as e:
        logger.error(f"Error in chat websocket: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except:
            pass
    finally:
        active_sessions.pop(f"chat_{session_id}", None)
        await llm_manager.unload_model()
        app_state.end_generation()

@router.post("/cancel/{session_id}")
async def cancel_transcription(session_id: str):
    if session_id in active_sessions:
        active_sessions[session_id].set()
        return {"status": "cancelled"}
    return {"status": "not_found"}