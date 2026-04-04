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

function formatSharpnessLabel(blur: number): string {
  if (blur < 20) {
    return 'Floue';
  }
  if (blur < 40) {
    return 'Correcte';
  }
  return 'Nette';
}

function formatLightingLabel(brightness: number): string {
  if (brightness < 70) {
    return 'Trop sombre';
  }
  if (brightness > 210) {
    return 'Trop fort';
  }
  return 'Correct';
}

function formatAxisScore(value: number): string {
  return `${(value / 10).toFixed(1)}/10`;
}

function formatPaceLabel(wpm: number): string {
  if (wpm > 160) {
    return 'Rapide';
  }
  if (wpm >= 120) {
    return 'Correct';
  }
  return 'Lent';
}

function formatEyeContactLabel(value: number): string {
  if (value >= 70) {
    return 'Bon';
  }
  if (value >= 40) {
    return 'Moyen';
  }
  return 'Faible';
}

function formatHandsLabel(value: number): string {
  if (value >= 60) {
    return 'Visibles';
  }
  if (value >= 30) {
    return 'Parfois visibles';
  }
  return 'Peu visibles';
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

  lines.push('## Scores & bilan', '');
  lines.push(`**Evaluation generale : ${report.summary.overall_score}/100**`);
  lines.push(`- Voix et rythme : ${formatAxisScore(report.scores.voice)}`);
  lines.push(`- Gestes et posture : ${formatAxisScore(report.scores.body_language)}`);
  lines.push(`- Regard camera et stabilite : ${formatAxisScore(report.scores.presence)}`);
  lines.push(`- Qualite video : ${formatAxisScore(report.scores.scene)}`, '');

  lines.push('## Ce qui fonctionne deja bien', '');
  if (report.strengths.length > 0) {
    report.strengths.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Aucun point fort detaille n a ete fourni.');
  }
  lines.push('');

  lines.push('## Ce que je vous conseille de corriger ensuite', '');
  if (report.weaknesses.length > 0) {
    report.weaknesses.forEach((item) => lines.push(`- ${item}`));
  } else {
    lines.push('- Aucun point de vigilance detaille n a ete fourni.');
  }
  lines.push('');

  lines.push('## Votre priorite pour la prochaine repetition', '');
  lines.push(`- Focus principal : ${report.summary.priority_focus || report.training_plan.focus_primary || 'Progression generale'}`);
  if (report.summary.encouragement) {
    lines.push(`- Encouragement : ${report.summary.encouragement}`);
  }
  lines.push('');

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

  lines.push('## Details des mesures', '');
  lines.push('### Voix');
  lines.push(`- Rythme de parole : ${report.metrics.wpm} mots/min (${formatPaceLabel(report.metrics.wpm)})`);
  lines.push(`- Pauses marquees (>0.5s) : ${report.metrics.pause_count}`);
  lines.push(`- Hesitations detectees : ${report.metrics.filler_count}`, '');
  lines.push('### Qualite video');
  lines.push(`- Eclairage : ${formatLightingLabel(report.metrics.brightness)}`);
  lines.push(`- Nettete de l image : ${formatSharpnessLabel(report.metrics.blur)}`, '');
  lines.push('### Presence a l ecran');
  lines.push(`- Visage visible dans le cadre : ${report.metrics.face_presence_ratio}%`);
  lines.push(`- Regard vers la camera : ${report.metrics.eye_contact_ratio}% (${formatEyeContactLabel(report.metrics.eye_contact_ratio)})`);
  lines.push(`- Mains visibles : ${report.metrics.hands_visibility_ratio}% (${formatHandsLabel(report.metrics.hands_visibility_ratio)})`);
  lines.push(`- Energie gestuelle : ${report.metrics.hands_activity_score}/10`, '');

  lines.push('## Transcription automatique', '');
  if (report.transcript.length > 0) {
    report.transcript.forEach((segment) => {
      lines.push(`- [${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s] ${segment.text}`);
    });
  } else {
    lines.push('- Aucune transcription disponible.');
  }

  return lines.join('\n');
}
