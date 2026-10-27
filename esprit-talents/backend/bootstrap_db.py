"""
Bootstrap DB — vérifie que le schéma SQLite correspond aux modèles actuels.
Si la base est absente OU si son schéma est obsolète (colonnes manquantes),
elle est recréée puis re-seedée automatiquement.
Lancé automatiquement par start_all.bat avant uvicorn.
"""

import sqlite3
from pathlib import Path

from core.config import settings
from core.database import Base, engine, init_db

DB_PATH = Path(settings.DATABASE_URL.replace("sqlite:///", ""))


def schema_is_stale() -> bool:
    """Compare les colonnes réelles de chaque table à celles attendues par les modèles."""
    if not DB_PATH.exists():
        return False  # géré par le cas "absente"

    conn = sqlite3.connect(DB_PATH)
    try:
        cur = conn.cursor()
        for table in Base.metadata.tables.values():
            cur.execute(f"PRAGMA table_info('{table.name}')")
            existing_cols = {row[1] for row in cur.fetchall()}
            if not existing_cols:
                continue  # table pas encore créée -> create_all s'en chargera
            expected_cols = {col.name for col in table.columns}
            if not expected_cols.issubset(existing_cols):
                return True
        return False
    finally:
        conn.close()


def main():
    if not DB_PATH.exists():
        print("[BOOTSTRAP] Base absente -> initialisation + seed")
        init_db()
        import seed  # exécute le script de seed
        return

    if schema_is_stale():
        print("[BOOTSTRAP] Schema obsolete detecte -> recreation de la base + seed")
        engine.dispose()
        DB_PATH.unlink()
        init_db()
        import seed
        return

    print("[BOOTSTRAP] Base a jour, aucun changement necessaire")


if __name__ == "__main__":
    main()
