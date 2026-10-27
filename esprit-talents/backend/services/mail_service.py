"""
Service email — mock en développement (log console), SMTP en production.
"""

import logging
from core.config import settings

logger = logging.getLogger("mail_service")


async def send_candidature_status(email: str, prenom: str, statut: str) -> None:
    messages = {
        "acceptee":  f"Félicitations {prenom}, votre candidature a été acceptée ! Vous êtes maintenant enseignant ESPRIT.",
        "refusee":   f"Bonjour {prenom}, votre candidature n'a pas été retenue cette fois. Vous pouvez postuler à d'autres offres.",
        "entretien": f"Bonjour {prenom}, vous êtes convoqué(e) à un entretien. Consultez l'application pour les détails.",
        "en_cours":  f"Bonjour {prenom}, votre candidature est en cours d'examen.",
    }
    body = messages.get(statut, f"Mise à jour de votre candidature : {statut}")

    if not settings.EMAILS_ENABLED:
        logger.info(f"[MAIL mock] → {email} | {body}")
        return

    try:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = "ESPRIT Talents — Mise à jour de votre candidature"
        msg["From"] = settings.SMTP_USER
        msg["To"] = email
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASS)
            smtp.send_message(msg)
    except Exception as e:
        logger.error(f"[MAIL] Échec envoi vers {email} : {e}")


async def send_talent_notification(email: str, prenom: str) -> None:
    body = f"Félicitations {prenom} ! Vous avez obtenu le statut Talent ESPRIT. Accédez à vos avantages depuis votre tableau de bord."
    if not settings.EMAILS_ENABLED:
        logger.info(f"[MAIL mock] Talent → {email} | {body}")
        return
    await send_candidature_status(email, prenom, "talent")
