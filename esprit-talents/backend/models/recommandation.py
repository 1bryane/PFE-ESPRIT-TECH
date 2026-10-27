import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Text, String, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class StatutRecommandationEnum(str, enum.Enum):
    en_attente = "en_attente"
    validee    = "validee"
    refusee    = "refusee"


class RecommandationTalent(Base):
    __tablename__ = "recommandations_talent"

    id                       = Column(Integer, primary_key=True, index=True)
    enseignant_id            = Column(Integer, ForeignKey("users.id"), nullable=False)
    recommandant_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    annee_academique         = Column(String(9), nullable=False)   # "2024-2025"

    # Scores /5 par dimension
    dim_scientifique         = Column(Float, nullable=True)
    dim_pedagogique          = Column(Float, nullable=True)
    dim_communicationnel     = Column(Float, nullable=True)
    dim_comportemental       = Column(Float, nullable=True)
    dim_autres               = Column(Float, nullable=True)

    # Justifications texte
    justif_scientifique      = Column(Text, nullable=True)
    justif_pedagogique       = Column(Text, nullable=True)
    justif_communicationnel  = Column(Text, nullable=True)
    justif_comportemental    = Column(Text, nullable=True)
    justif_autres            = Column(Text, nullable=True)

    commentaire_global       = Column(Text, nullable=True)
    score_moyen              = Column(Float, nullable=True)  # calculé automatiquement

    statut                   = Column(Enum(StatutRecommandationEnum), default=StatutRecommandationEnum.en_attente)
    validateur_id            = Column(Integer, ForeignKey("users.id"), nullable=True)
    date_validation          = Column(DateTime, nullable=True)
    commentaire_validation   = Column(Text, nullable=True)

    created_at               = Column(DateTime, default=datetime.utcnow)
    updated_at               = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    enseignant   = relationship("User", foreign_keys=[enseignant_id])
    recommandant = relationship("User", foreign_keys=[recommandant_id])
    validateur   = relationship("User", foreign_keys=[validateur_id])
