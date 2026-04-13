from __future__ import annotations

from html import escape
from io import BytesIO
from typing import Any, Dict, List


def _format_date(value: str) -> str:
    from datetime import datetime

    try:
        return datetime.fromisoformat(value).strftime('%d/%m/%Y')
    except Exception:
        return value or 'Non renseignee'


def _format_duration(seconds: Any) -> str:
    try:
        total_seconds = int(round(float(seconds)))
    except (TypeError, ValueError):
        total_seconds = 0

    if total_seconds <= 0:
        return 'Non renseignee'

    minutes, remaining_seconds = divmod(total_seconds, 60)
    if minutes == 0:
        return f'{remaining_seconds}s'
    if remaining_seconds == 0:
        return f'{minutes} min'
    return f'{minutes} min {remaining_seconds}s'


def _format_language(code: str) -> str:
    labels = {
        'fr': 'Francais',
        'en': 'English',
        'ar': 'Arabic',
        'unknown': 'Non renseignee',
    }
    normalized = str(code or 'unknown').strip().lower()
    return labels.get(normalized, normalized.upper())


def build_report_pdf(report: Dict[str, Any]) -> bytes:
    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
        from reportlab.lib.units import mm
        from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    except ImportError as error:
        raise RuntimeError('reportlab is required to generate PDF exports.') from error

    session = report.get('session') or {}
    summary = report.get('summary') or {}
    scores = report.get('scores') or {}
    metrics = report.get('metrics') or {}
    strengths = report.get('strengths') or []
    weaknesses = report.get('weaknesses') or []
    recommendations = report.get('recommendations') or []
    training_plan = report.get('training_plan') or {}
    transcript = report.get('transcript') or []

    palette = {
        'ink': colors.HexColor('#15212B'),
        'muted': colors.HexColor('#5E6B76'),
        'primary': colors.HexColor('#0E6B66'),
        'primary_soft': colors.HexColor('#E6F3F1'),
        'accent': colors.HexColor('#F2E2CD'),
        'border': colors.HexColor('#D9E1E5'),
        'surface': colors.HexColor('#FFFFFF'),
        'success': colors.HexColor('#2D7A55'),
        'warning': colors.HexColor('#C8873C'),
        'danger': colors.HexColor('#B6453D'),
    }

    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name='ReportTitle',
            parent=styles['Title'],
            fontName='Helvetica-Bold',
            fontSize=26,
            leading=30,
            textColor=palette['ink'],
            spaceAfter=8,
        )
    )
    styles.add(
        ParagraphStyle(
            name='SectionTitle',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=16,
            leading=20,
            textColor=palette['ink'],
            spaceBefore=10,
            spaceAfter=10,
        )
    )
    styles.add(
        ParagraphStyle(
            name='BodyTextCustom',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=10.5,
            leading=15,
            textColor=palette['ink'],
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name='MutedText',
            parent=styles['BodyText'],
            fontName='Helvetica',
            fontSize=9.5,
            leading=13,
            textColor=palette['muted'],
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name='ScoreValue',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=26,
            textColor=palette['primary'],
            alignment=TA_CENTER,
            spaceAfter=4,
        )
    )
    styles.add(
        ParagraphStyle(
            name='SmallLabel',
            parent=styles['BodyText'],
            fontName='Helvetica-Bold',
            fontSize=8,
            leading=10,
            textColor=palette['muted'],
            spaceAfter=2,
        )
    )

    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title=str(session.get('title', 'Rapport SpeechCoach')),
        author='SpeechCoach',
    )

    story: List[Any] = []

    story.append(Paragraph('SpeechCoach', styles['SmallLabel']))
    story.append(Paragraph(str(session.get('title', 'Rapport SpeechCoach')), styles['ReportTitle']))
    story.append(Paragraph(str(summary.get('headline', 'Resume executif')), styles['BodyTextCustom']))
    story.append(Spacer(1, 8))

    meta_table = Table(
        [
            ['Date', _format_date(str(session.get('created_at', ''))), 'Duree', _format_duration(session.get('duration_seconds', 0))],
            ['Langue', _format_language(str(session.get('language', 'unknown'))), 'Session', str(session.get('id', ''))[:8]],
        ],
        colWidths=[26 * mm, 54 * mm, 26 * mm, 54 * mm],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), palette['surface']),
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('TEXTCOLOR', (0, 0), (-1, -1), palette['ink']),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9.5),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 14))

    summary_table = Table(
        [
            [
                Paragraph(f"<b>Resume</b><br/>{escape(str(summary.get('narrative', '') or 'Resume indisponible.'))}", styles['BodyTextCustom']),
                Paragraph(f"{summary.get('overall_score', scores.get('overall', 0))}", styles['ScoreValue']),
            ]
        ],
        colWidths=[120 * mm, 42 * mm],
    )
    summary_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (0, 0), palette['surface']),
                ('BACKGROUND', (1, 0), (1, 0), palette['primary_soft']),
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 12),
                ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                ('TOPPADDING', (0, 0), (-1, -1), 12),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ]
        )
    )
    story.append(summary_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph('Vos reperes essentiels', styles['SectionTitle']))
    overall_table = Table(
        [['Evaluation generale', summary.get('overall_score', scores.get('overall', 0))]],
        colWidths=[110 * mm, 52 * mm],
    )
    overall_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('BACKGROUND', (0, 0), (-1, -1), palette['primary_soft']),
                ('FONTNAME', (0, 0), (0, 0), 'Helvetica-Bold'),
                ('FONTNAME', (1, 0), (1, 0), 'Helvetica-Bold'),
                ('TEXTCOLOR', (1, 0), (1, 0), palette['primary']),
                ('FONTSIZE', (0, 0), (0, 0), 11),
                ('FONTSIZE', (1, 0), (1, 0), 18),
                ('ALIGN', (1, 0), (1, 0), 'CENTER'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 10),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ]
        )
    )
    story.append(overall_table)
    story.append(Spacer(1, 8))

    score_rows = [
        ['Voix et rythme', scores.get('voice', 0), 'Gestes et posture', scores.get('body_language', 0)],
        ['Regard camera', scores.get('presence', 0), 'Qualite video', scores.get('scene', 0)],
    ]
    score_table = Table(score_rows, colWidths=[52 * mm, 29 * mm, 52 * mm, 29 * mm])
    score_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('BACKGROUND', (0, 0), (-1, -1), palette['surface']),
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('TEXTCOLOR', (1, 0), (1, -1), palette['primary']),
                ('TEXTCOLOR', (3, 0), (3, -1), palette['primary']),
                ('FONTSIZE', (0, 0), (0, -1), 9.5),
                ('FONTSIZE', (2, 0), (2, -1), 9.5),
                ('FONTSIZE', (1, 0), (1, -1), 13),
                ('FONTSIZE', (3, 0), (3, -1), 13),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(score_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph('Ce qui fonctionne deja bien / Ce que je vous conseille de corriger ensuite', styles['SectionTitle']))
    insights_data = [
        [
            Paragraph('<b>Ce qui fonctionne deja bien</b>', styles['BodyTextCustom']),
            Paragraph('<b>Ce que je vous conseille de corriger ensuite</b>', styles['BodyTextCustom']),
        ],
        [
            Paragraph('<br/>'.join(f'- {escape(str(item))}' for item in strengths) or 'Aucun point fort detaille.', styles['BodyTextCustom']),
            Paragraph('<br/>'.join(f'- {escape(str(item))}' for item in weaknesses) or 'Aucun axe detaille.', styles['BodyTextCustom']),
        ],
    ]
    insights_table = Table(insights_data, colWidths=[81 * mm, 81 * mm])
    insights_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('BACKGROUND', (0, 0), (-1, 0), palette['accent']),
                ('BACKGROUND', (0, 1), (-1, 1), palette['surface']),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(insights_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph('Votre prochaine action', styles['SectionTitle']))
    if recommendations:
        for item in recommendations:
            severity = str(item.get('severity', 'Info')).lower()
            tone = palette['primary']
            if severity == 'critical':
                tone = palette['danger']
            elif severity == 'warning':
                tone = palette['warning']

            recommendation_table = Table(
                [
                    [Paragraph(f"<b>{escape(str(item.get('category', 'General')))}</b>", styles['BodyTextCustom']), Paragraph(escape(str(item.get('severity', 'Info'))), styles['BodyTextCustom'])],
                    [Paragraph(escape(str(item.get('message', ''))), styles['BodyTextCustom']), ''],
                    [Paragraph(f"<b>Action terrain:</b> {escape(str(item.get('tip', '') or 'Continuez a pratiquer avec la meme exigence.'))}", styles['BodyTextCustom']), ''],
                ],
                colWidths=[140 * mm, 22 * mm],
            )
            recommendation_table.setStyle(
                TableStyle(
                    [
                        ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                        ('SPAN', (0, 1), (1, 1)),
                        ('SPAN', (0, 2), (1, 2)),
                        ('BACKGROUND', (0, 0), (0, 0), palette['surface']),
                        ('BACKGROUND', (1, 0), (1, 0), tone),
                        ('TEXTCOLOR', (1, 0), (1, 0), colors.white),
                        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                        ('LEFTPADDING', (0, 0), (-1, -1), 10),
                        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                        ('TOPPADDING', (0, 0), (-1, -1), 8),
                        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                    ]
                )
            )
            story.append(recommendation_table)
            story.append(Spacer(1, 8))
    else:
        fallback_text = escape(str(summary.get('priority_focus', '') or 'Conservez vos points forts et repetez avec la meme exigence.'))
        story.append(Paragraph(f"Aucune alerte majeure supplementaire. Priorite a garder en tete : {fallback_text}", styles['BodyTextCustom']))
    story.append(Spacer(1, 10))

    story.append(Paragraph('Details techniques', styles['SectionTitle']))
    metrics_table = Table(
        [
            ['Rythme de parole', f"{metrics.get('wpm', 0)} mots/min", 'Pauses marquees', str(metrics.get('pause_count', 0))],
            ['Hesitations', str(metrics.get('filler_count', 0)), 'Temps de silence', f"{metrics.get('pause_duration_total', 0)}s"],
            ['Visage visible dans le cadre', f"{metrics.get('face_presence_ratio', 0)}%", 'Regard vers la camera', f"{metrics.get('eye_contact_ratio', 0)}%"],
            ['Mains visibles', f"{metrics.get('hands_visibility_ratio', 0)}%", 'Qualite video', f"{scores.get('scene', 0)}/100"],
        ],
        colWidths=[42 * mm, 39 * mm, 42 * mm, 39 * mm],
    )
    metrics_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('BACKGROUND', (0, 0), (-1, -1), palette['surface']),
            ]
        )
    )
    story.append(metrics_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("Plan d'action", styles['SectionTitle']))
    story.append(Paragraph(f"<b>Focus principal:</b> {escape(str(training_plan.get('focus_primary', '') or 'Progression generale'))}", styles['BodyTextCustom']))
    story.append(Paragraph(f"<b>Focus secondaire:</b> {escape(str(training_plan.get('focus_secondary', '') or 'Consolidation'))}", styles['BodyTextCustom']))
    for day in training_plan.get('days', []):
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>{escape(str(day.get('title', 'Bloc de pratique')))}</b>", styles['BodyTextCustom']))
        items = day.get('items', []) or ['Pas de detail supplementaire pour ce bloc.']
        for item in items:
            story.append(Paragraph(f'- {escape(str(item))}', styles['MutedText']))
    story.append(Spacer(1, 14))

    if transcript:
        story.append(PageBreak())
        story.append(Paragraph('Transcription automatique', styles['SectionTitle']))
        for segment in transcript:
            start = float(segment.get('start', 0))
            end = float(segment.get('end', 0))
            text = escape(str(segment.get('text', '')))
            story.append(Paragraph(f"<b>{start:.1f}s - {end:.1f}s</b> - {text}", styles['MutedText']))

    def add_page_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(palette['muted'])
        canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f'Page {doc.page}')
        canvas.drawString(18 * mm, 10 * mm, 'SpeechCoach report export')
        canvas.restoreState()

    document.build(story, onFirstPage=add_page_footer, onLaterPages=add_page_footer)
    return buffer.getvalue()
