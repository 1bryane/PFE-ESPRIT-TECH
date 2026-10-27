from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from core.database import Base


class Message(Base):
    __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    sender_id  = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=True)   # None = room broadcast
    room_id    = Column(String(100), nullable=True, index=True)            # ex: "user_3_user_7"
    content    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_msg_room", "room_id", "created_at"),
    )

    sender   = relationship("User", foreign_keys=[sender_id],   back_populates="messages_envoyes")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="messages_recus")
