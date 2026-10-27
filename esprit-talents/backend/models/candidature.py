import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, Text, DateTime,
    Enum, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from core.database import Base


class StatutCandidatureEnum(str, enum.Enum):
    soumise   = "soumise"
    en_cours  = "en_cours"
    entretien = "entretien"
    acceptee  = "acceptee"
    refusee   = "refusee"


class Candidature(Base):
    __tablename__ = "candidatures"

    id                = Column(Integer, primary_key=True, index=True)
    candidat_id       = Column(Integer, ForeignKey("users.id"),  nullable=False)
    offre_id          = Column(Integer, ForeignKey("offres.id"), nullable=False)
    lettre_motivation = Column(Text, nullable=True)
    score_ml          = Column(Float, default=0.0)
    statut            = Column(Enum(StatutCandidatureEnum), default=StatutCandidatureEnum.soumise)
    commentaire_rp    = Column(Text, nullable=True)
    date_soumission   = Column(DateTime, default=datetime.utcnow)
    date_decision     = Column(DateTime, nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("candidat_id", "offre_id", name="uq_candidature"),
    )

    candidat = relationship("User",  foreign_keys=[candidat_id], back_populates="candidatures")
    offre    = relationship("Offre", back_populates="candidatures")
