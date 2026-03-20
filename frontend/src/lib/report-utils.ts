import { ReportResult } from '@/types/analytics';

const languageLabels: Record<string, string> = {
  fr: 'Francais',
  en: 'English',
  ar: 'Arabic',
};

export function formatReportDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value));
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Non renseignee';
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes} min ${remainingSeconds}s`;
}

export function formatLanguage(code: string): string {
  return languageLabels[code] || code.toUpperCase();
}

export function getScoreVerdict(score: number): string {
  if (score >= 85) {
    return 'Solide et partageable';
  }
  if (score >= 70) {
    return 'Base convaincante';
  }
  if (score >= 55) {
    return 'Progression visible';
  }
  return 'A retravailler';
}

export function buildMarkdownReport(report: ReportResult): string {
  const lines: string[] = [
    '# Rapport SpeechCoach',
    '',
    `## Session`,
    `- Titre : ${report.session.title}`,
    `- Date : ${formatReportDate(report.session.created_at)}`,
    `- Duree : ${formatDuration(report.session.duration_seconds)}`,
    `- Langue : ${formatLanguage(report.session.language)}`,
    '',
    '## Resume executif',
    `- Score global : ${report.summary.overall_score}/100`,
    `- Positionnement : ${report.summary.headline}`,
    `- Priorite : ${report.summary.priority_focus}`,
    '',
    report.summary.narrative,
    '',
  ];

  if (report.summary.encouragement) {
    lines.push(`> ${report.summary.encouragement}`, '');
  }

  lines.push('## Scores', '');
  lines.push(`- Voix : ${report.scores.voice}/100`);
  lines.push(`- Langage corporel : ${report.scores.body_language}/100`);
  lines.push(`- Presence : ${report.scores.presence}/100`);
  lines.push(`- Scene : ${report.scores.scene}/100`);
  lines.push(`- Regard : ${report.scores.eye_contact}/100`, '');

  lines.push('## Points forts', '');
  if (report.strengths.length > 0) {
    report.strengths.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Aucun point fort detaille n a ete fourni.');
  }
  lines.push('');

  lines.push('## Axes de progression', '');
  if (report.weaknesses.length > 0) {
    report.weaknesses.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Aucun point de vigilance detaille n a ete fourni.');
  }
  lines.push('');

  lines.push('## Recommandations', '');
  if (report.recommendations.length > 0) {
    report.recommendations.forEach((item) => {
      lines.push(`### ${item.category}`);
      lines.push(`- Severite : ${item.severity}`);
      lines.push(`- Diagnostic : ${item.message}`);
      lines.push(`- Action : ${item.tip}`);
      lines.push('');
    });
  } else {
    lines.push('- Continuez vos repetitions avec le meme niveau d exigence.', '');
  }

  lines.push('## Plan de pratique', '');
  lines.push(`- Focus principal : ${report.training_plan.focus_primary || 'Progression generale'}`);
  lines.push(`- Focus secondaire : ${report.training_plan.focus_secondary || 'Consolidation'}`);
  lines.push('');

  if (report.training_plan.days.length > 0) {
    report.training_plan.days.forEach((day) => {
      lines.push(`### ${day.title}`);
      if (day.items.length > 0) {
        day.items.forEach((item) => lines.push(`- ${item}`));
      }
      lines.push('');
    });
  }

  lines.push('## Metriques', '');
  lines.push(`- Debit vocal : ${report.metrics.wpm} WPM`);
  lines.push(`- Pauses : ${report.metrics.pause_count}`);
  lines.push(`- Fillers : ${report.metrics.filler_count}`);
  lines.push(`- Presence visage : ${report.metrics.face_presence_ratio}%`);
  lines.push(`- Regard camera : ${report.metrics.eye_contact_ratio}%`);
  lines.push(`- Visibilite des mains : ${report.metrics.hands_visibility_ratio}%`, '');

  lines.push('## Transcription', '');
  if (report.transcript.length > 0) {
    report.transcript.forEach((segment) => {
      lines.push(`- [${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s] ${segment.text}`);
    });
  } else {
    lines.push('- Aucune transcription disponible.');
  }

  return lines.join('\n');
}
