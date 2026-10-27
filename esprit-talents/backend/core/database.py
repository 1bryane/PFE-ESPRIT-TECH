"""
Moteur SQLAlchemy + session FastAPI.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite uniquement
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    Dépendance FastAPI — fournit une session SQLAlchemy par requête.

    Usage dans un endpoint :
        def mon_endpoint(db: Session = Depends(get_db)):
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Crée toutes les tables déclarées dans models/."""
    from models import user, offre, candidature, evaluation, formation, message, notification, formation_proposee, avantage_talent, recommandation, plan_carriere, distinction  # noqa: F401
    Base.metadata.create_all(bind=engine)
    # Migration douce : ajoute les colonnes absentes sans perte de données
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE formations ADD COLUMN programme TEXT",
            "ALTER TABLE formations ADD COLUMN description TEXT",
            "ALTER TABLE formations ADD COLUMN prerequis JSON",
            "ALTER TABLE formations ADD COLUMN competences_cibles JSON",
        ]:
            try:
                conn.execute(__import__("sqlalchemy").text(sql))
                conn.commit()
            except Exception:
                pass  # colonne déjà présente
