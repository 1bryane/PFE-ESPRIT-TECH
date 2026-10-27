import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class TypeDistinctionEnum(str, enum.Enum):
    enseignant_annee        = "enseignant_annee"
    responsable_resilient   = "responsable_resilient"
    challenge_annee         = "challenge_annee"
    innovation_pedagogique  = "innovation_pedagogique"
    publication_excellente  = "publication_excellente"
    autre                   = "autre"


class TypeRecompenseEnum(str, enum.Enum):
    avantage_nature = "avantage_nature"
    prime           = "prime"
    reconnaissance  = "reconnaissance"


class DistinctionTalent(Base):
    __tablename__ = "distinctions_talent"

    id                = Column(Integer, primary_key=True, index=True)
    enseignant_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    attribueur_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    type_distinction  = Column(Enum(TypeDistinctionEnum), nullable=False)
    libelle_custom    = Column(String(300), nullable=True)   # pour type "autre"
    description       = Column(Text, nullable=True)
    type_recompense   = Column(Enum(TypeRecompenseEnum), nullable=True)
    valeur_recompense = Column(String(300), nullable=True)   # ex: "Prime 500 DT", "Congé supplémentaire"
    annee_academique  = Column(String(9),  nullable=False)
    date_remise       = Column(Date, nullable=True)
    avantage_id       = Column(Integer, ForeignKey("avantages_talents.id"), nullable=True)
    recommandation_id = Column(Integer, ForeignKey("recommandations_talent.id"), nullable=True)
    created_at        = Column(DateTime, default=datetime.utcnow)

    enseignant     = relationship("User", foreign_keys=[enseignant_id])
    attribueur     = relationship("User", foreign_keys=[attribueur_id])
