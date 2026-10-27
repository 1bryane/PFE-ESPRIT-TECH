from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base


class AvantageTalent(Base):
    """Avantages définis par la Direction Générale pour les Talents ESPRIT."""
    __tablename__ = "avantages_talents"

    id          = Column(Integer, primary_key=True, index=True)
    categorie   = Column(String(50), nullable=False)   # Financier | Carriere | Opportunite | Reconnaissance
    libelle     = Column(String(300), nullable=False)
    is_active   = Column(Boolean, default=True)
    createur_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, default=datetime.utcnow)

    createur = relationship("User", foreign_keys=[createur_id])
