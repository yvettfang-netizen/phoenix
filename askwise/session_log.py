from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List


@dataclass
class SessionEntry:
    timestamp: str
    subject: str
    topic: str
    student_input: str
    diagnosis: str
    error_type: str
    learning_mode: str
    hint_level: int
    first_step_time: float | None
    outcome: str


class SessionLog:
    def __init__(self, path: str = "askwise_session_log.json") -> None:
        self.path = Path(path)

    def _load(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []
        try:
            with self.path.open("r", encoding="utf-8") as f:
                payload = json.load(f)
                if isinstance(payload, list):
                    return payload
        except (json.JSONDecodeError, OSError):
            return []
        return []

    def _save(self, entries: List[Dict[str, Any]]) -> None:
        with self.path.open("w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)

    def append(
        self,
        subject: str,
        topic: str,
        student_input: str,
        diagnosis: str,
        error_type: str,
        learning_mode: str,
        hint_level: int,
        outcome: str,
        first_step_time: float | None = None,
    ) -> None:
        entries = self._load()
        entries.append(
            {
                "timestamp": datetime.now().isoformat(),
                "subject": subject,
                "topic": topic,
                "student_input": student_input,
                "diagnosis": diagnosis,
                "error_type": error_type,
                "learning_mode": learning_mode,
                "hint_level": hint_level,
                "first_step_time": first_step_time,
                "outcome": outcome,
            }
        )
        self._save(entries)

    def to_json_objects(self) -> List[SessionEntry]:
        rows = self._load()
        return [SessionEntry(**row) for row in rows]
