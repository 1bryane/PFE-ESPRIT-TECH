import enum
from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Date,
    DateTime, Enum, JSON, ForeignKey,
)
from sqlalchemy.orm import relationship
from core.database import Base


class StatutOffreEnum(str, enum.Enum):
    ouverte  = "ouverte"
    fermee   = "fermee"
    pourvue  = "pourvue"


class Offre(Base):
    __tablename__ = "offres"

    id                   = Column(Integer, primary_key=True, index=True)
    titre                = Column(String(300), nullable=False)
    description          = Column(Text, nullable=False)
    departement          = Column(String(100), nullable=False)
    type_contrat         = Column(String(50), nullable=False, default="CDI")
    competences_requises = Column(JSON, nullable=True)
    date_publication     = Column(Date, default=date.today)
    date_expiration      = Column(Date, nullable=True)
    statut               = Column(Enum(StatutOffreEnum), default=StatutOffreEnum.ouverte)
    nb_postes            = Column(Integer, default=1)
    is_active            = Column(Boolean, default=True)
    createur_id          = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    createur             = relationship("User",        foreign_keys=[createur_id], back_populates="offres_creees")
    candidatures         = relationship("Candidature", back_populates="offre", cascade="all, delete-orphan")
