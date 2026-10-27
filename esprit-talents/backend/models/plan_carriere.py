import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Enum, ForeignKey, JSON
from sqlalchemy.orm import relationship
from core.database import Base


class TypePlanEnum(str, enum.Enum):
    poste_pedagogique    = "poste_pedagogique"
    projet               = "projet"
    responsabilite_mgt   = "responsabilite_mgt"
    developpement_comp   = "developpement_comp"


class StatutPlanEnum(str, enum.Enum):
    en_attente = "en_attente"   # Voie A : demande enseignant, attend approbation
    en_cours   = "en_cours"     # Approuvé (voie A) ou proposé directement (voie B)
    realise    = "realise"
    abandonne  = "abandonne"
    refuse     = "refuse"       # Manager refuse la demande voie A


class PlanCarriere(Base):
    __tablename__ = "plans_carriere"

    id                   = Column(Integer, primary_key=True, index=True)
    enseignant_id        = Column(Integer, ForeignKey("users.id"), nullable=False)
    createur_id          = Column(Integer, ForeignKey("users.id"), nullable=False)  # manager ou enseignant (voie A)
    type_plan            = Column(Enum(TypePlanEnum), nullable=False)
    titre                = Column(String(300), nullable=False)
    description          = Column(Text, nullable=True)
    poste_cible          = Column(String(200), nullable=True)       # pour poste_pedagogique / responsabilite_mgt
    formations_suggerees = Column(JSON, nullable=True)              # liste d'IDs ou titres
    competences_cibles   = Column(JSON, nullable=True)
    echeance             = Column(Date, nullable=True)
    statut               = Column(Enum(StatutPlanEnum), default=StatutPlanEnum.en_attente)
    notes_suivi          = Column(Text, nullable=True)
    # Voie A : l'enseignant initie (createur_id == enseignant_id)
    # Voie B : le manager initie (createur_id != enseignant_id) → statut démarre en_cours
    initie_par_enseignant = Column(Integer, default=0)  # 1 = voie A, 0 = voie B
    created_at           = Column(DateTime, default=datetime.utcnow)
    updated_at           = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    enseignant = relationship("User", foreign_keys=[enseignant_id])
    createur   = relationship("User", foreign_keys=[createur_id])
