import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, Date,
    DateTime, Enum, JSON,
)
from sqlalchemy.orm import relationship
from core.database import Base


class RoleEnum(str, enum.Enum):
    candidat          = "candidat"
    enseignant        = "enseignant"
    talent            = "talent"
    rp_chef           = "rp_chef"       # rétro-compat → chef_dept
    rp_coord          = "rp_coord"      # rétro-compat → cup
    rdff              = "rdff"
    chef_admin        = "chef_admin"
    direction_etudes  = "direction_etudes"
    direction         = "direction"
    # Nouveaux rôles organisationnels ESPRIT
    cup               = "cup"            # Coordinateur d'Unité Pédagogique
    chef_dept         = "chef_dept"      # Chef de Département pédagogique/support
    direction_dept    = "direction_dept" # Directeur d'une direction fonctionnelle
    responsable       = "responsable"    # Resp. Centre Carrière, Partenariats, Options
    cps               = "cps"            # Coordinateur Pédagogique des Stages
    charge_mission    = "charge_mission" # Chargé de Mission DG


class User(Base):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True, index=True)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password  = Column(String(255), nullable=False)
    nom              = Column(String(100), nullable=False)
    prenom           = Column(String(100), nullable=False)
    role             = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.candidat)
    departement      = Column(String(100), nullable=True)
    specialite       = Column(String(200), nullable=True)
    sous_role        = Column(String(100), nullable=True)  # ex: "cup_algorithmique", "direction_financiere"
    perimetre        = Column(String(200), nullable=True)  # entité gérée : "Informatique", "Option GL"
    telephone        = Column(String(20),  nullable=True)
    cv_path          = Column(String(500), nullable=True)
    photo_path       = Column(String(500), nullable=True)
    competences      = Column(JSON, nullable=True)   # liste extraite du CV
    score_global     = Column(Float, default=0.0)
    is_active        = Column(Boolean, default=True)
    is_talent        = Column(Boolean, default=False)
    date_talent      = Column(Date, nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    candidatures     = relationship("Candidature",  foreign_keys="Candidature.candidat_id",  back_populates="candidat",   cascade="all, delete-orphan")
    evaluations      = relationship("Evaluation",   foreign_keys="Evaluation.enseignant_id", back_populates="enseignant", cascade="all, delete-orphan")
    inscriptions     = relationship("Inscription",  foreign_keys="Inscription.enseignant_id", back_populates="enseignant", cascade="all, delete-orphan")
    offres_creees    = relationship("Offre",        foreign_keys="Offre.createur_id",        back_populates="createur")
    messages_envoyes = relationship("Message",      foreign_keys="Message.sender_id",        back_populates="sender")
    messages_recus   = relationship("Message",      foreign_keys="Message.receiver_id",      back_populates="receiver")

    @property
    def nom_complet(self) -> str:
        return f"{self.prenom} {self.nom}"
