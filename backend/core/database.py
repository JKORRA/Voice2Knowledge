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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                chat_model TEXT NOT NULL,
                messages TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_sessions(created_at DESC)
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL UNIQUE,
                title TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_updated ON sessions(updated_at DESC)
        """)
        conn.commit()
        conn.close()

    def add_transcription(
        self,
        session_id: str,
        filename: str,
        file_path: str,
        text_content: Optional[str] = None,
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
            (session_id, filename, file_path, text_content, model_size, language, device, duration_seconds, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id,
                filename,
                file_path,
                text_content,
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

    def save_chat_session(
        self,
        session_id: str,
        chat_model: str,
        messages: List[Dict[str, Any]],
    ) -> int:
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        existing = conn.execute(
            "SELECT id FROM chat_sessions WHERE session_id = ?", (session_id,)
        ).fetchone()

        if existing:
            conn.execute(
                "UPDATE chat_sessions SET messages = ?, updated_at = ? WHERE id = ?",
                (json.dumps(messages), now, existing[0]),
            )
            chat_id = existing[0]
        else:
            cursor = conn.execute(
                "INSERT INTO chat_sessions (session_id, chat_model, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (session_id, chat_model, json.dumps(messages), now, now),
            )
            chat_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return chat_id

    def get_chat_sessions(
        self, limit: int = 50, offset: int = 0, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        if search:
            query = """
                SELECT * FROM chat_sessions
                WHERE messages LIKE ?
                ORDER BY created_at DESC LIMIT ? OFFSET ?
            """
            cursor = conn.execute(query, (f"%{search}%", limit, offset))
        else:
            cursor = conn.execute(
                "SELECT * FROM chat_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            )
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_chat_session(self, chat_id: int) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?", (chat_id,)
        )
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

    def delete_chat_session(self, chat_id: int) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute(
            "DELETE FROM chat_sessions WHERE id = ?", (chat_id,)
        )
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return deleted

    def get_chat_session_count(self, search: Optional[str] = None) -> int:
        conn = sqlite3.connect(self.db_path)
        if search:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM chat_sessions WHERE messages LIKE ?",
                (f"%{search}%",),
            )
        else:
            cursor = conn.execute("SELECT COUNT(*) FROM chat_sessions")
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def ensure_session(self, session_id: str) -> None:
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        conn.execute(
            "INSERT OR IGNORE INTO sessions (session_id, title, created_at, updated_at) VALUES (?, '', ?, ?)",
            (session_id, now, now),
        )
        conn.execute(
            "UPDATE sessions SET updated_at = ? WHERE session_id = ?",
            (now, session_id),
        )
        conn.commit()
        conn.close()

    def get_sessions(
        self, limit: int = 50, offset: int = 0, search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        if search:
            cursor = conn.execute(
                """
                SELECT s.*,
                    COUNT(DISTINCT t.id) as transcription_count,
                    COUNT(DISTINCT cs.id) as chat_count
                FROM sessions s
                LEFT JOIN transcriptions t ON t.session_id = s.session_id
                LEFT JOIN chat_sessions cs ON cs.session_id = s.session_id
                WHERE s.title LIKE ?
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ? OFFSET ?
                """,
                (f"%{search}%", limit, offset),
            )
        else:
            cursor = conn.execute(
                """
                SELECT s.*,
                    COUNT(DISTINCT t.id) as transcription_count,
                    COUNT(DISTINCT cs.id) as chat_count
                FROM sessions s
                LEFT JOIN transcriptions t ON t.session_id = s.session_id
                LEFT JOIN chat_sessions cs ON cs.session_id = s.session_id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ? OFFSET ?
                """,
                (limit, offset),
            )
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def get_session_count(self, search: Optional[str] = None) -> int:
        conn = sqlite3.connect(self.db_path)
        if search:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM sessions WHERE title LIKE ?",
                (f"%{search}%",),
            )
        else:
            cursor = conn.execute("SELECT COUNT(*) FROM sessions")
        count = cursor.fetchone()[0]
        conn.close()
        return count

    def get_session_content(self, session_id: str) -> Optional[Dict[str, Any]]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        session_row = conn.execute(
            "SELECT * FROM sessions WHERE session_id = ?", (session_id,)
        ).fetchone()
        if not session_row:
            conn.close()
            return None

        transcriptions = conn.execute(
            "SELECT * FROM transcriptions WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()

        chat_rows = conn.execute(
            "SELECT * FROM chat_sessions WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,),
        ).fetchall()

        conn.close()

        chat_messages = []
        for row in chat_rows:
            try:
                msgs = json.loads(row["messages"])
                chat_messages.extend(msgs)
            except (json.JSONDecodeError, TypeError):
                pass

        return {
            "session": dict(session_row),
            "transcriptions": [dict(t) for t in transcriptions],
            "chats": chat_messages,
        }

    def update_session_title(self, session_id: str, title: str) -> bool:
        conn = sqlite3.connect(self.db_path)
        now = datetime.now().isoformat()
        cursor = conn.execute(
            "UPDATE sessions SET title = ?, updated_at = ? WHERE session_id = ?",
            (title, now, session_id),
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated

    def delete_session(self, session_id: str) -> bool:
        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("DELETE FROM sessions WHERE session_id = ?", (session_id,))
        deleted = cursor.rowcount > 0
        conn.execute("DELETE FROM transcriptions WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM chat_sessions WHERE session_id = ?", (session_id,))
        conn.commit()
        conn.close()
        return deleted


db = Database()