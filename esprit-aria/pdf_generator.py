"""
╔══════════════════════════════════════════════════════════════════════════╗
║         ESPRIT — Agent ARIA  ·  pdf_generator.py                       ║
║         Génère des PDFs professionnels pour les plans de formation      ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import io
import re
from datetime import datetime

from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT


# ── Palette ESPRIT ────────────────────────────────────────────────────────
RED         = HexColor("#E30613")
BLACK       = HexColor("#1A1A1A")
DARK_GREY   = HexColor("#2C2C2C")
MID_GREY    = HexColor("#8C8C8C")
LIGHT_GREY  = HexColor("#F4F4F4")
BORDER      = HexColor("#E0E0E0")
HONORIS     = HexColor("#7B1526")


def _build_styles() -> dict:
    """Construit le dictionnaire de styles Reportlab."""
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "title",
            fontName="Helvetica-Bold",
            fontSize=22,
            textColor=white,
            spaceAfter=4,
            leading=28,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName="Helvetica",
            fontSize=11,
            textColor=HexColor("#FFD0D0"),
            spaceAfter=0,
        ),
        "h2": ParagraphStyle(
            "h2",
            fontName="Helvetica-Bold",
            fontSize=13,
            textColor=RED,
            spaceBefore=14,
            spaceAfter=4,
            leading=18,
        ),
        "h3": ParagraphStyle(
            "h3",
            fontName="Helvetica-Bold",
            fontSize=11,
            textColor=BLACK,
            spaceBefore=10,
            spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body",
            fontName="Helvetica",
            fontSize=10,
            textColor=DARK_GREY,
            spaceAfter=4,
            leading=15,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            fontName="Helvetica",
            fontSize=10,
            textColor=DARK_GREY,
            spaceAfter=3,
            leading=14,
            leftIndent=14,
            bulletIndent=4,
        ),
        "meta": ParagraphStyle(
            "meta",
            fontName="Helvetica",
            fontSize=9,
            textColor=MID_GREY,
            spaceAfter=2,
        ),
        "footer": ParagraphStyle(
            "footer",
            fontName="Helvetica",
            fontSize=8,
            textColor=MID_GREY,
            alignment=TA_CENTER,
        ),
        "week_title": ParagraphStyle(
            "week_title",
            fontName="Helvetica-Bold",
            fontSize=10,
            textColor=RED,
            spaceAfter=2,
        ),
        "week_body": ParagraphStyle(
            "week_body",
            fontName="Helvetica",
            fontSize=9,
            textColor=DARK_GREY,
            leading=13,
            leftIndent=10,
        ),
    }
    return styles


def _header_table(title: str, subtitle: str, user_name: str) -> Table:
    """Crée le bandeau rouge en-tête."""
    data = [[
        Paragraph(title, _build_styles()["title"]),
        Paragraph(
            f'<para align="right">'
            f'<font color="#FFD0D0" size="9">Genere par ARIA</font><br/>'
            f'<font color="white" size="10"><b>{user_name}</b></font><br/>'
            f'<font color="#FFD0D0" size="8">{datetime.now().strftime("%d/%m/%Y")}</font>'
            f'</para>',
            ParagraphStyle("hdr_right", fontName="Helvetica", fontSize=9,
                           textColor=white, alignment=TA_RIGHT),
        ),
    ]]
    t = Table(data, colWidths=[12 * cm, 5.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), RED),
        ("TOPPADDING",    (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 16),
        ("LEFTPADDING",   (0, 0), (-1, -1), 18),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 18),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _parse_plan_to_sections(plan_text: str) -> list:
    """
    Parse le texte du plan ARIA en sections structurées.
    Détecte les marqueurs Markdown (##, ###, **, *, -).
    """
    sections = []
    for line in plan_text.splitlines():
        stripped = line.strip()
        if not stripped:
            sections.append(("empty", ""))
        elif stripped.startswith("## "):
            sections.append(("h2", stripped[3:]))
        elif stripped.startswith("### "):
            sections.append(("h3", stripped[4:]))
        elif stripped.startswith("**") and stripped.endswith("**"):
            sections.append(("h3", stripped.strip("**")))
        elif stripped.startswith("* ") or stripped.startswith("- "):
            sections.append(("bullet", stripped[2:]))
        elif re.match(r"^\d+\.", stripped):
            sections.append(("numbered", stripped))
        else:
            # Nettoyer le gras inline **texte**
            cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", stripped)
            sections.append(("body", cleaned))
    return sections


def generate_plan_pdf(
    plan_text: str,
    user_name: str = "Enseignant",
    objectif: str = "",
    duree: int = 8,
    niveau: str = "intermédiaire",
) -> bytes:
    """
    Génère un PDF professionnel à partir du texte de plan retourné par ARIA.

    Args:
        plan_text   : Texte complet du plan (format Markdown)
        user_name   : Nom de l'enseignant
        objectif    : Objectif de la formation
        duree       : Durée en semaines
        niveau      : Niveau de la formation

    Returns:
        bytes du fichier PDF généré
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
        title=f"Plan ARIA — {user_name}",
        author="ESPRIT Talents — Agent ARIA",
    )

    styles = _build_styles()
    story = []

    # ── En-tête ────────────────────────────────────────────────────────
    plan_title = objectif or "Plan de Formation Personnalisé"
    story.append(_header_table(plan_title, "Plan ARIA", user_name))
    story.append(Spacer(1, 0.4 * cm))

    # ── Méta-données ───────────────────────────────────────────────────
    meta_data = [
        ["Enseignant",  user_name],
        ["Duree",       f"{duree} semaines"],
        ["Niveau",      niveau.capitalize()],
        ["Date",        datetime.now().strftime("%d %B %Y")],
        ["Genere par",  "ARIA — Agent IA ESPRIT Talents"],
    ]
    meta_table = Table(meta_data, colWidths=[4 * cm, 13.5 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, -1), LIGHT_GREY),
        ("BACKGROUND",    (1, 0), (1, -1), white),
        ("TEXTCOLOR",     (0, 0), (0, -1), MID_GREY),
        ("TEXTCOLOR",     (1, 0), (1, -1), BLACK),
        ("FONTNAME",      (0, 0), (0, -1), "Helvetica"),
        ("FONTNAME",      (1, 0), (1, -1), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.5, BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(HRFlowable(width="100%", thickness=2, color=RED))
    story.append(Spacer(1, 0.3 * cm))

    # ── Corps du plan ─────────────────────────────────────────────────
    sections = _parse_plan_to_sections(plan_text)
    item_counter = 0

    for kind, text in sections:
        if not text and kind == "empty":
            story.append(Spacer(1, 0.2 * cm))
        elif kind == "h2":
            story.append(Spacer(1, 0.2 * cm))
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER))
            story.append(Paragraph(text, styles["h2"]))
            item_counter = 0
        elif kind == "h3":
            story.append(Paragraph(text, styles["h3"]))
        elif kind == "bullet":
            story.append(Paragraph(f"• {text}", styles["bullet"]))
        elif kind == "numbered":
            story.append(Paragraph(text, styles["bullet"]))
        elif kind == "body" and text:
            story.append(Paragraph(text, styles["body"]))

    # ── Pied de page ───────────────────────────────────────────────────
    story.append(Spacer(1, 1 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER))
    story.append(Spacer(1, 0.3 * cm))

    footer_data = [[
        Paragraph(
            "ESPRIT — Se former autrement | Honoris United Universities",
            styles["footer"],
        ),
        Paragraph(
            f"Document genere automatiquement par ARIA · {datetime.now().strftime('%d/%m/%Y %H:%M')}",
            styles["footer"],
        ),
    ]]
    footer_table = Table(footer_data, colWidths=[8.75 * cm, 8.75 * cm])
    footer_table.setStyle(TableStyle([
        ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))
    story.append(footer_table)

    doc.build(story)
    return buffer.getvalue()
