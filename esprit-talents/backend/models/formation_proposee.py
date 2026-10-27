import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class StatutProposeeEnum(str, enum.Enum):
    en_attente = "en_attente"
    acceptee   = "acceptee"
    refusee    = "refusee"


class FormationProposee(Base):
    """
    Plan de formation généré par ARIA, soumis par un enseignant au RDFF
    pour validation avant intégration au catalogue officiel.
    """
    __tablename__ = "formations_proposees"

    id                = Column(Integer, primary_key=True, index=True)
    proposeur_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    titre             = Column(String(300), nullable=False)
    plan_text         = Column(Text, nullable=False)   # texte brut ARIA
    objectif          = Column(Text, nullable=True)
    duree_semaines    = Column(Integer, nullable=True)
    niveau            = Column(String(50), nullable=True)
    statut            = Column(Enum(StatutProposeeEnum), default=StatutProposeeEnum.en_attente)
    commentaire_rdff  = Column(Text, nullable=True)    # retour RDFF si refus
    formation_id      = Column(Integer, ForeignKey("formations.id"), nullable=True)  # si acceptée → formation créée
    created_at        = Column(DateTime, default=datetime.utcnow)
    validated_at      = Column(DateTime, nullable=True)

    proposeur  = relationship("User",      foreign_keys=[proposeur_id])
    formation  = relationship("Formation", foreign_keys=[formation_id])
