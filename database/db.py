import os
from typing import Dict, List, Optional, Any
from backend.models.schemas import QueueEntry, ConsentUpgrade, BusinessConfig, User, TenantId

# In-Memory Realtime Database Engine (mirroring Supabase interface for local & hybrid environments)
class DatabaseManager:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.queue_entries: Dict[str, QueueEntry] = {}
        self.consent_upgrades: Dict[str, ConsentUpgrade] = {}
        self.configs: Dict[str, BusinessConfig] = {}
        self.audit_logs: List[Dict[str, Any]] = []

    def get_entries_for_business(self, business_id: TenantId) -> List[QueueEntry]:
        items = [e for e in self.queue_entries.values() if e.businessId == business_id]
        # Sort waiting by priority score descending, then by creation time
        waiting = [e for e in items if e.status == 'waiting']
        waiting.sort(key=lambda x: (-x.priorityScore, x.createdAt))
        for idx, entry in enumerate(waiting):
            entry.positionInQueue = idx + 1

        in_progress = [e for e in items if e.status == 'in_progress']
        completed = [e for e in items if e.status == 'completed']
        cancelled = [e for e in items if e.status == 'cancelled']
        return in_progress + waiting + completed + cancelled

    def get_consent_upgrades_for_business(self, business_id: TenantId) -> List[ConsentUpgrade]:
        return [c for c in self.consent_upgrades.values() if c.businessId == business_id]

    def add_queue_entry(self, entry: QueueEntry):
        self.queue_entries[entry.id] = entry

    def update_queue_entry(self, entry_id: str, updates: Dict[str, Any]) -> Optional[QueueEntry]:
        if entry_id in self.queue_entries:
            entry = self.queue_entries[entry_id]
            updated_data = entry.dict()
            updated_data.update(updates)
            self.queue_entries[entry_id] = QueueEntry(**updated_data)
            return self.queue_entries[entry_id]
        return None

    def add_audit_log(self, business_id: TenantId, event_type: str, raw_input: str, details: Dict[str, Any]):
        self.audit_logs.insert(0, {
            "id": f"log_{len(self.audit_logs) + 1}",
            "businessId": business_id,
            "eventType": event_type,
            "rawInput": raw_input,
            "details": details,
            "timestamp": "now"
        })

db = DatabaseManager()
