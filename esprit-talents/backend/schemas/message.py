from __future__ import annotations
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int]
    room_id: Optional[str]
    content: str
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    receiver_id: int
    content: str
