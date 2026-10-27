from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, Text, String,
    DateTime, JSON, ForeignKey, Index,
)
from sqlalchemy.orm import relationship
from core.database import Base


class Evaluation(Base):
    __tablename__ = "evaluations"

    id                = Column(Integer, primary_key=True, index=True)
    enseignant_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    evaluateur_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    annee_academique  = Column(String(9),  nullable=False)   # "2024-2025"
    semestre          = Column(String(10), nullable=True)    # "S1" | "S2"
    note_pedagogie        = Column(Float, nullable=True)
    note_ponctualite      = Column(Float, nullable=True)
    note_engagement       = Column(Float, nullable=True)
    note_innovation       = Column(Float, nullable=True)
    note_scientifique     = Column(Float, nullable=True)
    note_communicationnel = Column(Float, nullable=True)
    note_globale          = Column(Float, nullable=True)
    commentaire       = Column(Text, nullable=True)
    points_forts      = Column(JSON, nullable=True)
    axes_amelioration = Column(JSON, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_eval_ens_annee", "enseignant_id", "annee_academique"),
    )

    enseignant = relationship("User", foreign_keys=[enseignant_id], back_populates="evaluations")
    evaluateur = relationship("User", foreign_keys=[evaluateur_id])
