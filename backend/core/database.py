import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

from backend.core.config import APP_DATA_DIR


class Database:
    def __init__(self, db_path: Path = None):
        self.db_path = db_path or APP_DATA_DIR / "voice2knowledge.db"
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transcriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                file_path TEXT NOT NULL,
                text_content TEXT,
                vtt_path TEXT,
                model_size TEXT,
                language TEXT,
                device TEXT,
                duration_seconds REAL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_created_at ON transcriptions(created_at DESC)
        """)
        conn.commit()
        conn.close()

    def add_transcription(
        self,
        session_id: str,
        filename: str,
        file_path: str,
        text_content: Optional[str] = None,
        vtt_path: Optional[str] = None,
        model_size: str = "small",
        language: str = "auto",
        device: str = "cpu",
        duration_seconds: Optional[float] = None,
    ) -> int:
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        cursor = conn.execute(
            """
            INSERT INTO transcriptions 
            (session_id, filename, file_path, text_content, vtt_path, model_size, language, device, duration_seconds, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                filename,
                file_path,
                text_content,
                vtt_path,
                model_size,
                language,
                device,
                duration_seconds,
                now,
                now,
            ),
        )
        transcription_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return transcription_id

    def update_transcription(self, transcription_id: int, **kwargs):
        if not kwargs:
            return
        conn = sqlite3.connect(self.db_path)
        kwargs["updated_at"] = datetime.now().isoformat()
        set_clause = ", ".join([f"{k} = ?" for k in kwargs.keys()])
        values = list(kwargs.values()) + [transcription_id]
        conn.execute(
            f"UPDATE transcriptions SET {set_clause} WHERE id = ?",
            values,
        )
        conn.commit()
        conn.close()

    def get_transcription(self, transcription_id: int) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM transcriptions WHERE id = ?",
            (transcription_id,),
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def get_transcriptions(
        self, limit: int = 50, offset: int = 0, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        if search:
            query = """
                SELECT * FROM transcriptions 
                WHERE filename LIKE ? OR text_content LIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """
            search_term = f"%{search}%"
            cursor = conn.execute(query, (search_term, search_term, limit, offset))
        else:
            cursor = conn.execute(
                "SELECT * FROM transcriptions ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )

        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def delete_transcription(self, transcription_id: int) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "DELETE FROM transcriptions WHERE id = ?",
            (transcription_id,),
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def get_transcription_count(self, search: Optional[str] = None) -> int:
        conn = sqlite3.connect(self.db_path)
        if search:
            query = """
                SELECT COUNT(*) FROM transcriptions 
                WHERE filename LIKE ? OR text_content LIKE ?
            """
            search_term = f"%{search}%"
            cursor = conn.execute(query, (search_term, search_term))
        else:
            cursor = conn.execute("SELECT COUNT(*) FROM transcriptions")
        count = cursor.fetchone()[0]
        conn.close()
        return count


db = Database()