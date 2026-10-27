import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean,
    Date, DateTime, Enum, JSON, ForeignKey, UniqueConstraint,
)
from sqlalchemy.orm import relationship
from core.database import Base


class NiveauEnum(str, enum.Enum):
    debutant      = "débutant"
    intermediaire = "intermédiaire"
    avance        = "avancé"
    expert        = "expert"


class StatutInscriptionEnum(str, enum.Enum):
    inscrit   = "inscrit"
    en_cours  = "en_cours"
    termine   = "terminé"
    abandonne = "abandonné"


class Formation(Base):
    __tablename__ = "formations"

    id                 = Column(Integer, primary_key=True, index=True)
    code               = Column(String(20), unique=True, nullable=False)
    titre              = Column(String(300), nullable=False)
    description        = Column(Text, nullable=True)
    objectifs          = Column(JSON, nullable=True)
    prerequis          = Column(JSON, nullable=True)
    duree_semaines     = Column(Integer, nullable=True)
    niveau             = Column(Enum(NiveauEnum), default=NiveauEnum.intermediaire)
    badge              = Column(String(200), nullable=True)
    competences_cibles = Column(JSON, nullable=True)
    programme          = Column(Text, nullable=True)
    is_active          = Column(Boolean, default=True)
    createur_id        = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at         = Column(DateTime, default=datetime.utcnow)
    updated_at         = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    inscriptions = relationship("Inscription", back_populates="formation", cascade="all, delete-orphan")
    createur     = relationship("User", foreign_keys=[createur_id])


class Inscription(Base):
    __tablename__ = "inscriptions"

    id               = Column(Integer, primary_key=True, index=True)
    enseignant_id    = Column(Integer, ForeignKey("users.id"),      nullable=False)
    formation_id     = Column(Integer, ForeignKey("formations.id"), nullable=False)
    statut           = Column(Enum(StatutInscriptionEnum), default=StatutInscriptionEnum.inscrit)
    progression      = Column(Float, default=0.0)
    note_finale      = Column(Float, nullable=True)
    badge_obtenu     = Column(Boolean, default=False)
    date_inscription = Column(Date, default=date.today)
    date_fin         = Column(Date, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("enseignant_id", "formation_id", name="uq_inscription"),
    )

    enseignant = relationship("User",      foreign_keys=[enseignant_id], back_populates="inscriptions")
    formation  = relationship("Formation", back_populates="inscriptions")
