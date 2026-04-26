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


def _format_pace_label(wpm: Any) -> str:
    try:
        value = int(round(float(wpm)))
    except (TypeError, ValueError):
        value = 0
    if value > 160:
        return 'Rapide'
    if value >= 120:
        return 'Optimal'
    if value > 0:
        return 'Lent'
    return 'N/A'


def _format_lighting_label(brightness: Any) -> str:
    try:
        value = int(round(float(brightness)))
    except (TypeError, ValueError):
        value = 0
    if value < 70:
        return 'Sous-expose'
    if value > 210:
        return 'Surexpose'
    return 'Optimal'


def _format_sharpness_label(blur: Any) -> str:
    try:
        value = int(round(float(blur)))
    except (TypeError, ValueError):
        value = 0
    if value < 20:
        return 'Flou critique'
    if value < 40:
        return 'Legerement flou'
    return 'Optimal'


def _format_eye_contact_label(value: Any) -> str:
    try:
        ratio = int(round(float(value)))
    except (TypeError, ValueError):
        ratio = 0
    if ratio >= 70:
        return 'Bon'
    if ratio >= 40:
        return 'Moyen'
    return 'Faible'


def _format_hands_label(value: Any) -> str:
    try:
        ratio = int(round(float(value)))
    except (TypeError, ValueError):
        ratio = 0
    if ratio >= 60:
        return 'Visibles'
    if ratio >= 30:
        return 'Parfois visibles'
    return 'Peu visibles'


def _format_activity_label(value: Any) -> str:
    try:
        score = float(value)
    except (TypeError, ValueError):
        score = 0.0
    if score > 6.5:
        return 'Agite'
    if score >= 2.5:
        return 'Equilibre'
    return 'Fige'


def _cell_label(text: str, styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls(f"<b>{escape(text)}</b>", styles['BodyTextCustom'])


def _cell_value(text: str, styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls(escape(text), styles['BodyTextCustom'])


def _cell_target(text: str, styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls(f"Objectif : {escape(text)}", styles['MutedText'])


def _cell_value_with_target(value_text: str, target_text: str, styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls(
        f"{escape(value_text)}<br/><font size='9' color='#5E6B76'>Objectif : {escape(target_text)}</font>",
        styles['BodyTextCustom'],
    )


def _cell_value_with_indicators(value_text: str, indicators_text: str, styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls(
        f"{escape(value_text)}<br/><font size='9' color='#5E6B76'>Indicateurs : {escape(indicators_text)}</font>",
        styles['BodyTextCustom'],
    )


def _cell_empty(styles: Any, paragraph_cls: Any) -> Any:
    return paragraph_cls('', styles['BodyTextCustom'])


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
    eq_metrics = report.get('eq_metrics') or {}
    strengths = report.get('strengths') or []
    weaknesses = report.get('weaknesses') or []
    training_plan = report.get('training_plan') or {}
    exercise_recommendation = report.get('exercise_recommendation') or {}
    transcript = report.get('transcript') or []

    palette = {
        'ink': colors.HexColor('#15212B'),
        'muted': colors.HexColor('#5E6B76'),
        'primary': colors.HexColor('#0E6B66'),
        'primary_soft': colors.HexColor('#E6F3F1'),
        'secondary_soft': colors.HexColor('#F0F4F8'),
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
            [
                _cell_label('Date de session', styles, Paragraph),
                _cell_value(_format_date(str(session.get('created_at', ''))), styles, Paragraph),
                _cell_label('Duree video', styles, Paragraph),
                _cell_value(_format_duration(session.get('duration_seconds', 0)), styles, Paragraph),
            ],
            [
                _cell_label('Langue', styles, Paragraph),
                _cell_value(_format_language(str(session.get('language', 'unknown'))), styles, Paragraph),
                _cell_label("Temps d'analyse", styles, Paragraph),
                _cell_value(_format_duration(session.get('processing_time', 0)), styles, Paragraph),
            ],
        ],
        colWidths=[28 * mm, 53 * mm, 30 * mm, 49 * mm],
    )
    meta_table.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, -1), palette['surface']),
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('TEXTCOLOR', (0, 0), (-1, -1), palette['ink']),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(meta_table)
    story.append(Spacer(1, 10))

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
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            f"<b>Priorite :</b> {escape(str(summary.get('priority_focus', '') or 'Progression generale'))}",
            styles['BodyTextCustom'],
        )
    )
    if summary.get('encouragement'):
        story.append(Paragraph(escape(str(summary.get('encouragement'))), styles['MutedText']))
    story.append(Spacer(1, 8))

    story.append(Paragraph('Scores & bilan', styles['SectionTitle']))
    overall_table = Table(
        [['Score global', f"{summary.get('overall_score', scores.get('overall', 0))}/100"]],
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
    story.append(Spacer(1, 6))

    score_rows = [
        ['Voix / Debit', f"{scores.get('voice', 0) / 10:.1f}/10", 'Posture / Gestes', f"{scores.get('body_language', 0) / 10:.1f}/10"],
        ['Regard / Presence', f"{scores.get('presence', 0) / 10:.1f}/10", 'Qualite / Cadrage', f"{scores.get('scene', 0) / 10:.1f}/10"],
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
    story.append(Spacer(1, 10))

    story.append(Paragraph('Points forts / Axes de progression', styles['SectionTitle']))
    insights_data = [
        [
            Paragraph('<b>Points forts</b>', styles['BodyTextCustom']),
            Paragraph('<b>Axes de progression</b>', styles['BodyTextCustom']),
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
    story.append(Spacer(1, 10))

    story.append(Paragraph('Details techniques', styles['SectionTitle']))

    # Build metrics table with categories
    table_data = []

    # Helper function to create category headers
    def _category_header(text: str):
        return [
            Paragraph(f"<b>{text}</b>", styles['BodyText']),
            Paragraph('', styles['BodyText']),
            Paragraph('', styles['BodyText']),
            Paragraph('', styles['BodyText']),
            Paragraph('', styles['BodyText'])
        ]

    # Metriques vocales
    table_data.append(_category_header('Metriques vocales'))
    table_data.append([
        _cell_label('Debit (WPM)', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('wpm', 0)} mots/min ({_format_pace_label(metrics.get('wpm', 0))})",
            'Entre 120 et 160 mots/min (Maitrise)',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Pauses (>0.5s)', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('pause_count', 0)} pause(s)",
            'Moins de 4 pauses longues par minute',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Hesitations', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('filler_count', 0)} detectee(s)",
            'Moins de 2 mots parasites par minute',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Repetitions', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('stutter_count', 0)} detectee(s)",
            'Aucune repetition pour un score optimal',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])

    # Qualite visuelle
    table_data.append(_category_header('Qualite visuelle'))
    table_data.append([
        _cell_label('Luminosite', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('brightness', 0)} ({_format_lighting_label(metrics.get('brightness', 0))})",
            "Entre 70 et 210 pour eviter l'eblouissement",
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Nettete', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('blur', 0)} ({_format_sharpness_label(metrics.get('blur', 0))})",
            'Score superieur a 40 pour une image nette',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])

    # Metriques visuelles
    table_data.append(_category_header('Metriques visuelles'))
    table_data.append([
        _cell_label('Presence visage', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('face_presence_ratio', 0)}%",
            'Superieure a 80% dans le cadre',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Contact visuel', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('eye_contact_ratio', 0)}% ({_format_eye_contact_label(metrics.get('eye_contact_ratio', 0))})",
            'Soutenir la camera (> 70% du temps)',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Mains visibles', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('hands_visibility_ratio', 0)}% ({_format_hands_label(metrics.get('hands_visibility_ratio', 0))})",
            'Mains dans le cadre (> 60% du temps)',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])
    table_data.append([
        _cell_label('Intensite gestuelle (mains)', styles, Paragraph),
        _cell_value_with_target(
            f"{metrics.get('hands_activity_score', 0)}/10 ({_format_activity_label(metrics.get('hands_activity_score', 0))})",
            'Mouvement equilibre (2.5 a 6.5/10)',
            styles,
            Paragraph,
        ),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
        _cell_empty(styles, Paragraph),
    ])

    # Indicateurs emotionnels (EQ metrics) - at the end since they're derived from other metrics
    if eq_metrics and isinstance(eq_metrics, dict):
        eq_scores = eq_metrics.get('scores') or {}
        eq_objectives = eq_metrics.get('objectives') or {}
        emotion_scores = eq_metrics.get('emotion_scores') or {}

        table_data.append(_category_header('Indicateurs emotionnels'))

        stress_score = int(eq_scores.get('stress') or 0)
        stress_data = eq_objectives.get('stress') or {}
        stress_aspects = ', '.join(stress_data.get('aspects') or [])
        table_data.append([
            _cell_label('Stress', styles, Paragraph),
            _cell_value_with_indicators(
                f"{stress_score}/100",
                stress_aspects if stress_aspects else '-',
                styles,
                Paragraph,
            ),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
        ])

        confidence_score = int(eq_scores.get('confidence') or 0)
        confidence_data = eq_objectives.get('confidence') or {}
        confidence_aspects = ', '.join(confidence_data.get('aspects') or [])
        table_data.append([
            _cell_label('Confiance', styles, Paragraph),
            _cell_value_with_indicators(
                f"{confidence_score}/100",
                confidence_aspects if confidence_aspects else '-',
                styles,
                Paragraph,
            ),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
        ])

        articulation_score = int(eq_scores.get('articulation') or 0)
        articulation_data = eq_objectives.get('articulation') or {}
        articulation_aspects = ', '.join(articulation_data.get('aspects') or [])
        table_data.append([
            _cell_label('Articulation', styles, Paragraph),
            _cell_value_with_indicators(
                f"{articulation_score}/100",
                articulation_aspects if articulation_aspects else '-',
                styles,
                Paragraph,
            ),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
            _cell_empty(styles, Paragraph),
        ])

        # Add comparison table if emotion_scores available
        if emotion_scores and isinstance(emotion_scores, dict):
            rule_based = emotion_scores.get('rule_based') or {}
            model_based = emotion_scores.get('model_based') or {}

            rule_eq = rule_based.get('eq_scores') or {}
            model_eq = model_based.get('eq_scores') or {}

            if rule_eq and model_eq:
                table_data.append(_category_header('Comparaison des méthodes d\'analyse'))

                # Comparison table header
                table_data.append([
                    _cell_label('Méthode', styles, Paragraph),
                    _cell_label('Stress', styles, Paragraph),
                    _cell_label('Confiance', styles, Paragraph),
                    _cell_label('Articulation', styles, Paragraph),
                    _cell_empty(styles, Paragraph),
                ])

                # Rule-based row
                table_data.append([
                    _cell_value('Règles (Librosa/MediaPipe)', styles, Paragraph),
                    _cell_value(f"{int(rule_eq.get('stress') or 0)}/100", styles, Paragraph),
                    _cell_value(f"{int(rule_eq.get('confidence') or 0)}/100", styles, Paragraph),
                    _cell_value(f"{int(rule_eq.get('articulation') or 0)}/100", styles, Paragraph),
                    _cell_empty(styles, Paragraph),
                ])

                # Model-based row
                table_data.append([
                    _cell_value('IA (Wav2Vec2/HSEmotion)', styles, Paragraph),
                    _cell_value(f"{int(model_eq.get('stress') or 0)}/100", styles, Paragraph),
                    _cell_value(f"{int(model_eq.get('confidence') or 0)}/100", styles, Paragraph),
                    _cell_value(f"{int(model_eq.get('articulation') or 0)}/100", styles, Paragraph),
                    _cell_empty(styles, Paragraph),
                ])

                # Show top emotions from model-based approach
                fused_emotions = model_based.get('fused_emotions') or {}
                if fused_emotions:
                    # Filter out None values before sorting
                    valid_emotions = {k: v for k, v in fused_emotions.items() if v is not None}
                    if valid_emotions:
                        top_emotions = sorted(valid_emotions.items(), key=lambda x: x[1], reverse=True)[:3]
                        emotion_text = ', '.join([f"{label} ({int(prob*100)}%)" for label, prob in top_emotions])
                        table_data.append([
                            _cell_label('Émotions détectées (IA)', styles, Paragraph),
                            _cell_value(emotion_text, styles, Paragraph),
                            _cell_empty(styles, Paragraph),
                            _cell_empty(styles, Paragraph),
                            _cell_empty(styles, Paragraph),
                        ])

    metrics_table = Table(table_data, colWidths=[55 * mm, 35 * mm, 24 * mm, 24 * mm, 24 * mm])

    # Calculate row indices for styling
    eq_rows = []
    vocal_rows = []
    visual_quality_rows = []
    visual_metrics_rows = []

    current_row = 0

    vocal_start = current_row
    current_row += 1  # Category header
    current_row += 4  # WPM, Pauses, Hesitations, Repetitions
    vocal_end = current_row - 1

    visual_quality_start = current_row
    current_row += 1  # Category header
    current_row += 2  # Luminosite, Nettete
    visual_quality_end = current_row - 1

    visual_metrics_start = current_row
    current_row += 1  # Category header
    current_row += 4  # Presence, Contact, Mains, Intensite
    visual_metrics_end = current_row - 1

    if eq_metrics and isinstance(eq_metrics, dict):
        eq_start = current_row
        current_row += 1  # Category header
        current_row += 3  # Stress, Confidence, Articulation
        eq_end = current_row - 1

        # Check if we have emotion_scores for comparison
        comparison_start = None
        emotion_scores = eq_metrics.get('emotion_scores') or {}
        if emotion_scores and isinstance(emotion_scores, dict):
            comparison_start = current_row
            current_row += 1  # Comparison category header
            current_row += 1  # Comparison table header
            current_row += 2  # Rule-based and Model-based rows
            # Check if we have emotion labels
            model_based = emotion_scores.get('model_based') or {}
            if model_based.get('fused_emotions'):
                current_row += 1  # Emotions detected row
            comparison_end = current_row - 1

    metrics_table.setStyle(
        TableStyle(
            [
                ('BOX', (0, 0), (-1, -1), 0.75, palette['border']),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, palette['border']),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, 0), (-1, -1), palette['surface']),
            ]
        )
    )

    # Add background colors for category headers
    style_updates = []
    if eq_metrics and isinstance(eq_metrics, dict):
        style_updates.append(('BACKGROUND', (0, eq_start), (-1, eq_start), palette['primary_soft']))
        style_updates.append(('TEXTCOLOR', (0, eq_start), (-1, eq_start), palette['ink']))
        style_updates.append(('BOTTOMPADDING', (0, eq_start), (-1, eq_start), 8))
        style_updates.append(('TOPPADDING', (0, eq_start), (-1, eq_start), 8))

        # Style comparison section if present
        emotion_scores = eq_metrics.get('emotion_scores') or {}
        if emotion_scores and isinstance(emotion_scores, dict):
            rule_based = emotion_scores.get('rule_based') or {}
            model_based = emotion_scores.get('model_based') or {}
            if rule_based.get('eq_scores') and model_based.get('eq_scores') and comparison_start is not None:
                style_updates.append(('BACKGROUND', (0, comparison_start), (-1, comparison_start), palette['secondary_soft']))
                style_updates.append(('TEXTCOLOR', (0, comparison_start), (-1, comparison_start), palette['ink']))
                style_updates.append(('BOTTOMPADDING', (0, comparison_start), (-1, comparison_start), 8))
                style_updates.append(('TOPPADDING', (0, comparison_start), (-1, comparison_start), 8))

    style_updates.append(('BACKGROUND', (0, vocal_start), (-1, vocal_start), palette['primary_soft']))
    style_updates.append(('TEXTCOLOR', (0, vocal_start), (-1, vocal_start), palette['ink']))
    style_updates.append(('BOTTOMPADDING', (0, vocal_start), (-1, vocal_start), 8))
    style_updates.append(('TOPPADDING', (0, vocal_start), (-1, vocal_start), 8))

    style_updates.append(('BACKGROUND', (0, visual_quality_start), (-1, visual_quality_start), palette['primary_soft']))
    style_updates.append(('TEXTCOLOR', (0, visual_quality_start), (-1, visual_quality_start), palette['ink']))
    style_updates.append(('BOTTOMPADDING', (0, visual_quality_start), (-1, visual_quality_start), 8))
    style_updates.append(('TOPPADDING', (0, visual_quality_start), (-1, visual_quality_start), 8))

    style_updates.append(('BACKGROUND', (0, visual_metrics_start), (-1, visual_metrics_start), palette['primary_soft']))
    style_updates.append(('TEXTCOLOR', (0, visual_metrics_start), (-1, visual_metrics_start), palette['ink']))
    style_updates.append(('BOTTOMPADDING', (0, visual_metrics_start), (-1, visual_metrics_start), 8))
    style_updates.append(('TOPPADDING', (0, visual_metrics_start), (-1, visual_metrics_start), 8))

    # Apply dynamic spanning to handle the mixed column layout (metrics vs comparison)
    for i in range(len(table_data)):
        # Identify if this row is a category header
        is_header = i in [vocal_start, visual_quality_start, visual_metrics_start]
        if eq_metrics and isinstance(eq_metrics, dict):
            if i == eq_start:
                is_header = True
            if comparison_start is not None and i == comparison_start:
                is_header = True

        if is_header:
            # Full span for headers
            style_updates.append(('SPAN', (0, i), (-1, i)))
        elif comparison_start is not None and i in [comparison_start + 1, comparison_start + 2, comparison_start + 3]:
            # Comparison table header/rows: span last two columns to ensure text fits
            style_updates.append(('SPAN', (3, i), (4, i)))
        else:
            # Regular metrics rows: span col 1 to the end for the value/target description
            style_updates.append(('SPAN', (1, i), (-1, i)))

    # Apply the additional styles
    for style_update in style_updates:
        metrics_table.setStyle(TableStyle([style_update]))

    story.append(metrics_table)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Prochain exercice", styles['SectionTitle']))
    focus_primary = (
        exercise_recommendation.get('focus_primary')
        or training_plan.get('focus_primary')
        or summary.get('priority_focus')
        or 'Progression generale'
    )
    story.append(Paragraph(f"<b>Focus:</b> {escape(str(focus_primary))}", styles['BodyTextCustom']))

    if summary.get('exercice_titre'):
        story.append(Paragraph(f"<b>Exercice:</b> {escape(str(summary.get('exercice_titre')))}", styles['BodyTextCustom']))

    if exercise_recommendation.get('summary'):
        story.append(Paragraph(f"Objectif : {escape(str(exercise_recommendation.get('summary')))}", styles['MutedText']))

    consigne = str(summary.get('exercice_consigne') or '')
    steps = [s.strip() for s in consigne.split(' | ') if s.strip()]
    if not steps and consigne:
        steps = [s.strip() for s in consigne.splitlines() if s.strip()]
    if not steps:
        steps = [str(step).strip() for step in exercise_recommendation.get('steps', []) if str(step).strip()]

    if steps:
        story.append(Spacer(1, 4))
        for i, step in enumerate(steps, start=1):
            step_table = Table(
                [[Paragraph(f"<b>{i}</b>", styles['BodyTextCustom']), Paragraph(escape(step), styles['BodyTextCustom'])]],
                colWidths=[10 * mm, 152 * mm]
            )
            step_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(step_table)
    elif training_plan.get('days'):
        for day in training_plan.get('days', []):
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"<b>{escape(str(day.get('title', 'Bloc de pratique')))}</b>", styles['BodyTextCustom']))
            items = day.get('items', []) or ['Pas de detail supplementaire pour ce bloc.']
            for item in items:
                story.append(Paragraph(f'- {escape(str(item))}', styles['MutedText']))
    else:
        story.append(Paragraph('Reprenez votre discours en appliquant le conseil prioritaire.', styles['MutedText']))
    story.append(Spacer(1, 8))

    if transcript:
        story.append(Spacer(1, 6))
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
