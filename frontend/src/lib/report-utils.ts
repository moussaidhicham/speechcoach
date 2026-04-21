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
