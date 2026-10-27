"""Prepare data for demo — run once before the demo."""
import sqlite3, json
from datetime import datetime, date

conn = sqlite3.connect('esprit_talents.db')
cur = conn.cursor()

# 1. Reset candidat1 to candidat
cur.execute("UPDATE users SET role='candidat' WHERE email='candidat1@esprit.tn'")

# 2. Make enseignant1 a proper Talent (role + flag)
cur.execute("UPDATE users SET role='talent', is_talent=1 WHERE email='enseignant1@esprit.tn'")

# 3. Evaluation de Fatma (id=9) par CUP Web (id=13)
cur.execute("SELECT id FROM evaluations WHERE enseignant_id=9 AND evaluateur_id=13")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO evaluations
        (enseignant_id, evaluateur_id, annee_academique, semestre,
         note_pedagogie, note_ponctualite, note_engagement, note_innovation,
         note_globale, commentaire, points_forts, axes_amelioration, created_at)
        VALUES (9, 13, '2024-2025', 'S1',
                17.0, 18.0, 16.0, 15.0,
                16.5, 'Excellente maitrise Web & Mobile',
                '["Cours interactifs", "Suivi excellent des etudiants"]',
                '["Plus de projets pratiques"]',
                ?)
    """, (datetime.now().isoformat(),))
    print("+ eval Fatma par CUP Web")

# 4. Evaluation de Sami (id=17) par Chef Dept (id=14)
cur.execute("SELECT id FROM evaluations WHERE enseignant_id=17 AND evaluateur_id=14")
if not cur.fetchone():
    cur.execute("""
        INSERT INTO evaluations
        (enseignant_id, evaluateur_id, annee_academique, semestre,
         note_pedagogie, note_ponctualite, note_engagement, note_innovation,
         note_globale, commentaire, points_forts, axes_amelioration, created_at)
        VALUES (17, 14, '2024-2025', 'S1',
                16.0, 17.0, 18.0, 14.0,
                16.25, 'Tres bon enseignant Java/Spring',
                '["Expertise technique", "Disponibilite"]',
                '["Ameliorer support de cours"]',
                ?)
    """, (datetime.now().isoformat(),))
    print("+ eval Sami par Chef Dept")

# 5. Inscription terminee + badge pour Fatma → permettre demande Talent
cur.execute("SELECT id FROM formations LIMIT 1")
row = cur.fetchone()
if row:
    fid = row[0]
    cur.execute("SELECT id FROM inscriptions WHERE enseignant_id=9")
    ins = cur.fetchone()
    if ins:
        cur.execute("UPDATE inscriptions SET statut='termine', badge_obtenu=1 WHERE enseignant_id=9")
        print("~ badge Fatma updated")
    else:
        cur.execute("""
            INSERT INTO inscriptions (enseignant_id, formation_id, statut, badge_obtenu, date_inscription)
            VALUES (9, ?, 'termine', 1, ?)
        """, (fid, date.today().isoformat()))
        print("+ badge Fatma inserted")

# 6. Candidature de candidat2 (id=11) pour avoir 2 candidats actifs
cur.execute("SELECT id FROM candidatures WHERE candidat_id=11")
if not cur.fetchone():
    cur.execute("SELECT id FROM offres LIMIT 1")
    offre = cur.fetchone()
    if offre:
        cur.execute("""
            INSERT INTO candidatures (candidat_id, offre_id, statut, date_candidature)
            VALUES (11, ?, 'soumise', ?)
        """, (offre[0], date.today().isoformat()))
        print("+ candidature Ines")

conn.commit()

# Verification finale
print("\n=== Etat final ===")
cur.execute("SELECT email, role, is_talent FROM users ORDER BY id")
for r in cur.fetchall():
    print(r)
print()
cur.execute("SELECT COUNT(*) FROM evaluations");     print("evaluations:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM candidatures");    print("candidatures:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM inscriptions WHERE badge_obtenu=1")
print("badges obtenus:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM recommandations_talent"); print("recommandations:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM plans_carriere");         print("plans_carriere:", cur.fetchone()[0])
cur.execute("SELECT COUNT(*) FROM distinctions_talent");    print("distinctions:", cur.fetchone()[0])
conn.close()
