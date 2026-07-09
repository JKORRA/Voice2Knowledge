import logging
import asyncio
import threading
from backend.core.database import db
from backend.core.llm_manager import llm_manager
from backend.core.state import app_state

logger = logging.getLogger(__name__)

async def generate_title_in_background(
    session_id: str,
    chat_model: str,
    chat_provider: str,
    external_api_key: str = "",
    external_api_model: str = "",
    external_api_base_url: str = ""
):
    """
    Analyzes the session's transcriptions and chat history to dynamically generate a title.
    Gracefully aborts if the system is busy with another local model task.
    """
    try:
        session_data = db.get_session_content(session_id)
        if not session_data:
            return

        session_info = session_data.get("session", {})
        current_title = session_info.get("title", "")
        
        # If it already has a custom title (not empty and not the default UUID prefix)
        if current_title and not current_title.startswith("Session "):
            return

        transcriptions = session_data.get("transcriptions", [])
        chats = session_data.get("chats", [])

        # Gather context (up to ~300 words)
        context_parts = []
        word_count = 0
        
        for t in transcriptions:
            content = t.get("text_content", "")
            if content:
                context_parts.append(content)
                word_count += len(content.split())
                if word_count > 300:
                    break
        
        if word_count < 300:
            for c in chats:
                content = c.get("content", "")
                if content:
                    context_parts.append(f"{c.get('role', 'user')}: {content}")
                    word_count += len(content.split())
                    if word_count > 300:
                        break

        context_text = "\n".join(context_parts)
        if not context_text.strip():
            return

        # Truncate to roughly 300 words to save compute
        words = context_text.split()
        if len(words) > 300:
            context_text = " ".join(words[:300])

        prompt = (
            "You are an AI assistant. Analyze the following text and generate a short, descriptive title (3 to 5 words). "
            "Respond ONLY with the title itself. Do not include quotes, prefixes, or any extra text.\n\n"
            f"Text:\n{context_text}"
        )

        messages = [{"role": "user", "content": prompt}]
        generated_title = ""

        if chat_provider == "external":
            if not external_api_key or not external_api_model:
                logger.warning("Missing external API settings for title generation.")
                return
                
            try:
                from litellm import acompletion
                response = await acompletion(
                    model=external_api_model,
                    messages=messages,
                    api_key=external_api_key,
                    base_url=external_api_base_url if external_api_base_url else None,
                    max_tokens=15,
                    stream=False
                )
                if response and response.choices and len(response.choices) > 0:
                    generated_title = response.choices[0].message.content.strip()
            except Exception as e:
                logger.error(f"External API error during title generation: {e}")
                return

        else:
            # Local LLM
            if not llm_manager.is_model_downloaded(chat_model):
                return
                
            # Try to acquire generation lock
            if not app_state.start_generation():
                logger.info("System busy, skipping background title generation.")
                return
                
            try:
                cancel_event = threading.Event()
                async for token in llm_manager.generate_stream(messages, cancel_event, chat_model):
                    generated_title += token
                    if len(generated_title.split()) > 10:  # Safety break if model hallucinates long response
                        cancel_event.set()
                        break
            except Exception as e:
                logger.error(f"Local LLM error during title generation: {e}")
                return
            finally:
                app_state.end_generation()
                # We intentionally don't unload the model here immediately to avoid slowing down subsequent chat operations, 
                # but if memory is a concern, we could await llm_manager.unload_model() here. 
                # For now, we leave it in memory to speed up the next chat message.

        generated_title = generated_title.strip(' "\'.')
        
        # Cleanup
        if "\n" in generated_title:
            generated_title = generated_title.split("\n")[0].strip()
            
        if generated_title and len(generated_title) > 3:
            db.update_session_title(session_id, generated_title)
            logger.info(f"Generated title for session {session_id}: {generated_title}")
            
    except Exception as e:
        logger.error(f"Error in background title generation: {e}")
