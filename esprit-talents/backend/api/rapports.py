"""
API Rapports — génération de PDFs professionnels pour les profils enseignants.
Endpoint utilisé par le Chef Département pour exporter un profil complet.
"""
import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import require_role
from models.user import User
from models.evaluation import Evaluation
from models.formation import Inscription

router = APIRouter()


def _generate_profil_pdf(user: User, evals, inscriptions) -> bytes:
    """Génère un PDF professionnel pour le profil d'un enseignant."""
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib.colors import HexColor

    RED        = HexColor("#E30613")
    BLACK      = HexColor("#1A1A1A")
    DARK_GREY  = HexColor("#2C2C2C")
    MID_GREY   = HexColor("#8C8C8C")
    LIGHT_GREY = HexColor("#F4F4F4")
    BORDER     = HexColor("#E0E0E0")
    WHITE      = HexColor("#FFFFFF")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=1.5*cm, bottomMargin=2*cm)

    def style(name, **kw):
        return ParagraphStyle(name, **kw)

    S = {
        "title":  style("t",  fontName="Helvetica-Bold", fontSize=18, textColor=WHITE),
        "sub":    style("s",  fontName="Helvetica",      fontSize=10, textColor=HexColor("#FFD0D0")),
        "h2":     style("h2", fontName="Helvetica-Bold", fontSize=12, textColor=RED,   spaceBefore=12, spaceAfter=4),
        "body":   style("b",  fontName="Helvetica",      fontSize=10, textColor=DARK_GREY, spaceAfter=3, leading=14),
        "meta":   style("m",  fontName="Helvetica",      fontSize=9,  textColor=MID_GREY),
        "footer": style("f",  fontName="Helvetica",      fontSize=8,  textColor=MID_GREY),
    }

    story = []

    # En-tête rouge
    hdr = Table([[
        Paragraph(f"{user.prenom} {user.nom}", S["title"]),
        Paragraph(
            f'<para align="right"><font color="#FFD0D0" size="9">Rapport d\'activite</font><br/>'
            f'<font color="white" size="9">{datetime.now().strftime("%d/%m/%Y")}</font></para>',
            style("hr", fontName="Helvetica", fontSize=9, textColor=WHITE),
        ),
    ]], colWidths=[11*cm, 5.5*cm])
    hdr.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), RED),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(hdr)
    story.append(Spacer(1, 0.4*cm))

    # Informations personnelles
    info = [
        ["Role",        user.role.value],
        ["Email",       user.email],
        ["Departement", user.departement or "—"],
        ["Specialite",  user.specialite  or "—"],
        ["Telephone",   user.telephone   or "—"],
        ["Statut",      "TALENT ESPRIT ★" if user.is_talent else "Enseignant"],
        ["Score global", f"{user.score_global or 0}/100"],
    ]
    if user.is_talent and user.date_talent:
        info.append(["Date Talent", str(user.date_talent)])

    info_table = Table(info, colWidths=[4*cm, 13.5*cm])
    info_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), LIGHT_GREY),
        ("TEXTCOLOR",     (0, 0), (0, -1), MID_GREY),
        ("TEXTCOLOR",     (1, 0), (1, -1), BLACK),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica"),
        ("FONTNAME",      (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=RED))

    # Compétences
    if user.competences:
        story.append(Paragraph("Competences", S["h2"]))
        comps = ", ".join(user.competences[:20])
        story.append(Paragraph(comps, S["body"]))

    # Statistiques évaluations
    if evals["nb"] > 0:
        story.append(Paragraph("Statistiques des evaluations", S["h2"]))
        ev_data = [
            ["Nombre d'evaluations", str(evals["nb"])],
            ["Moyenne globale",      f"{evals['globale']}/20"],
            ["Pedagogie",            f"{evals['pedagogie']}/20"],
            ["Ponctualite",          f"{evals['ponctualite']}/20"],
            ["Engagement",           f"{evals['engagement']}/20"],
            ["Innovation",           f"{evals['innovation']}/20"],
        ]
        ev_table = Table(ev_data, colWidths=[6*cm, 11.5*cm])
        ev_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (0, -1), LIGHT_GREY),
            ("TEXTCOLOR",     (0, 0), (0, -1), MID_GREY),
            ("FONTNAME",      (1, 0), (1, -1), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ]))
        story.append(ev_table)

    # Formations suivies
    if inscriptions:
        story.append(Paragraph("Formations suivies", S["h2"]))
        f_data = [["Formation", "Progression", "Badge"]]
        for i in inscriptions:
            f_data.append([
                i.formation.titre if i.formation else f"#{i.formation_id}",
                f"{i.progression:.0f}%",
                "Oui ★" if i.badge_obtenu else "Non",
            ])
        f_table = Table(f_data, colWidths=[10*cm, 3*cm, 4.5*cm])
        f_table.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), DARK_GREY),
            ("TEXTCOLOR",     (0, 0), (-1, 0), WHITE),
            ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
        ]))
        story.append(f_table)

    # Pied de page
    story.append(Spacer(1, 1*cm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        f"ESPRIT Talents — Rapport genere le {datetime.now().strftime('%d/%m/%Y a %H:%M')}",
        S["footer"],
    ))

    doc.build(story)
    return buf.getvalue()


@router.get("/{user_id}/profil-pdf")
def export_profil_pdf(
    user_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_role(["rp_chef", "chef_admin", "direction", "direction_etudes"])),
):
    """Génère et retourne le rapport PDF du profil d'un enseignant."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Stats évaluations
    result = db.query(
        func.count(Evaluation.id).label("nb"),
        func.avg(Evaluation.note_globale).label("globale"),
        func.avg(Evaluation.note_pedagogie).label("pedagogie"),
        func.avg(Evaluation.note_ponctualite).label("ponctualite"),
        func.avg(Evaluation.note_engagement).label("engagement"),
        func.avg(Evaluation.note_innovation).label("innovation"),
    ).filter(Evaluation.enseignant_id == user_id).first()

    evals = {
        "nb":          result.nb or 0,
        "globale":     round(result.globale    or 0, 1),
        "pedagogie":   round(result.pedagogie  or 0, 1),
        "ponctualite": round(result.ponctualite or 0, 1),
        "engagement":  round(result.engagement  or 0, 1),
        "innovation":  round(result.innovation  or 0, 1),
    }

    # Inscriptions avec formations
    inscriptions = db.query(Inscription).filter(Inscription.enseignant_id == user_id).all()

    pdf_bytes = _generate_profil_pdf(user, evals, inscriptions)
    filename  = f"rapport_{user.nom}_{user.prenom}.pdf"

    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
