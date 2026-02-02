# SpeechCoach (PFE Master SIE)

Systeme de coaching automatique de prise de parole via analyse multimodale (Audio + Vision).

## Installation

### 1. Pré-requis Système
Ce projet nécessite **FFmpeg** pour le traitement vidéo.
*   **Windows** : Télécharger sur [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) (release full), extraire, et ajouter le dossier `bin` au PATH système.
*   **Linux** : `sudo apt install ffmpeg`
*   **Mac** : `brew install ffmpeg`

Pour vérifier :
```bash
ffmpeg -version
```

### 2. Environnement Python
Il est recommandé d'utiliser un environnement virtuel.
```bash
pip install -r requirements.txt
```

## Structure
*   `ingest/` : Scripts d'extraction (FFmpeg)
*   `audio/` : Analyse audio (Whisper, Librosa) - *À venir Sprint 1 & 2*
*   `vision/` : Analyse visuelle (MediaPipe) - *À venir Sprint 3*
*   `metrics/` : Définitions des données (JSON Schema)
*   `process_video.py` : Point d'entrée principal

## Utilisation
```bash
python process_video.py C:\path\to\video.mp4 --output ./outputs
```
