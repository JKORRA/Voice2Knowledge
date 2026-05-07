from dataclasses import dataclass
import threading

@dataclass
class AppState:
    is_transcribing: bool = False
    is_generating: bool = False
    lock: threading.Lock = threading.Lock()

    def start_transcription(self) -> bool:
        with self.lock:
            if self.is_generating:
                return False
            self.is_transcribing = True
            return True

    def end_transcription(self):
        with self.lock:
            self.is_transcribing = False

    def start_generation(self) -> bool:
        with self.lock:
            if self.is_transcribing:
                return False
            self.is_generating = True
            return True

    def end_generation(self):
        with self.lock:
            self.is_generating = False

app_state = AppState()
