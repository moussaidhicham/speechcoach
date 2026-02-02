import os
import argparse
import logging
import json
from ingest.ffmpeg_wrapper import extract_audio, extract_frames, get_video_duration
from metrics.schema import SpeechCoachReport, VideoMetadata

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_video(video_path: str, output_dir: str):
    """
    Main orchestration function.
    """
    video_path = os.path.abspath(video_path)
    output_dir = os.path.abspath(output_dir)
    
    # 0. Setup
    video_name = os.path.splitext(os.path.basename(video_path))[0]
    session_dir = os.path.join(output_dir, video_name)
    os.makedirs(session_dir, exist_ok=True)
    
    audio_path = os.path.join(session_dir, "audio.wav")
    frames_dir = os.path.join(session_dir, "frames")
    report_path = os.path.join(session_dir, "report.json")
    
    logger.info(f"Starting analysis for: {video_name}")
    logger.info(f"Session directory: {session_dir}")

    # 1. Ingest (FFmpeg)
    logger.info("Step 1: Ingestion...")
    if not extract_audio(video_path, audio_path):
        logger.error("Audio extraction failed. Aborting.")
        return
    
    if not extract_frames(video_path, frames_dir, fps=1.0):
        logger.error("Frame extraction failed. Aborting.")
        return

    duration = get_video_duration(video_path)
    
    # 2. Analysis
    logger.info("Step 2: Analysis...")
    
    # 2a. ASR (Transcription)
    from audio.asr import ASRProcessor
    
    # Initialize ASR (Consider moving this outside if processing batch to avoid reload)
    # Using 'medium' model by default, 'int8' for CPU performance
    asr = ASRProcessor(model_size="medium", device="cpu", compute_type="int8")
    
    transcript_segments, language = asr.transcribe(audio_path)
    
    if not transcript_segments:
        logger.warning("Transcription returned empty. Check audio quality.")
    
    # 2b. Audio Analytics (Sprint 2)
    from audio.analytics import analyze_audio_file
    audio_metrics = analyze_audio_file(audio_path, transcript_segments, language=language)

    # 2c. Vision Analytics (Sprint 3)
    from vision.analysis import analyze_frames
    # Pass the frames directory
    vision_metrics = analyze_frames(frames_dir)
    
    # Create the report object
    metadata = VideoMetadata(
        filename=video_name,
        duration_seconds=duration,
        fps=1.0, 
        resolution=(0,0),
        detected_language=language
    )
    
    report = SpeechCoachReport(
        metadata=metadata,
        transcript=transcript_segments,
        audio_metrics=audio_metrics,
        vision_metrics=vision_metrics
    )
    
    # 3. Output
    logger.info("Step 3: Generating Output...")
    
    # JSON Dump
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report.to_dict(), f, indent=2, ensure_ascii=False)
        
    # Generate Minimal Markdown Report (Sprint 1+2 Goal)
    md_report_path = os.path.join(session_dir, "report_minimal.md")
    with open(md_report_path, 'w', encoding='utf-8') as f:
        f.write((f"# Rapport SpeechCoach : {video_name}\n\n"))
        f.write((f"**Langue détectée** : {language.upper()}\n"))
        f.write((f"**Durée** : {duration:.2f} secondes\n\n"))
        
        f.write("## 🎤 Métriques Vocales (Audio)\n")
        f.write(f"- **Débit (WPM)** : {audio_metrics.wpm} mots/min ")
        if audio_metrics.wpm > 160: f.write("⚠️ (Rapide)")
        elif audio_metrics.wpm < 110: f.write("⚠️ (Lent)")
        else: f.write("✅ (Bon rythme)")
        f.write("\n")
        
        f.write(f"- **Pauses (>0.5s)** : {audio_metrics.pause_count} pauses\n")
        f.write(f"- **Hésitations (Fillers)** : {audio_metrics.filler_count} détectées\n\n")

        f.write("## 📷 Métriques Visuelles (Vision)\n")
        f.write(f"- **Présence Visage** : {vision_metrics.face_presence_ratio:.0%} du temps ")
        if vision_metrics.face_presence_ratio > 0.8: f.write("✅")
        elif vision_metrics.face_presence_ratio < 0.5: f.write("⚠️")
        f.write("\n")

        f.write("## 📝 Transcription\n\n")
        for seg in transcript_segments:
            f.write((f"- **[{seg.start:.1f}s - {seg.end:.1f}s]** : {seg.text}\n"))
            
    logger.info(f"Done! Report saved to: {report_path}")
    logger.info(f"Readable report: {md_report_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SpeechCoach - AI Video Coaching")
    parser.add_argument("video_path", help="Path to the input MP4 video")
    parser.add_argument("--output", default="./outputs", help="Directory where results will be saved")
    
    args = parser.parse_args()
    
    if not os.path.exists(args.video_path):
        print(f"Error: Video file not found: {args.video_path}")
        exit(1)
        
    process_video(args.video_path, args.output)
