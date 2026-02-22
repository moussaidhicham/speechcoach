import os
import argparse
import logging
import json
import time
from ingest.ffmpeg_wrapper import extract_audio, extract_frames, get_video_metadata
from metrics.schema import SpeechCoachReport, VideoMetadata

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_video(video_path: str, output_dir: str):
    """
    Main orchestration function.
    """
    start_time = time.time()
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

    video_meta = get_video_metadata(video_path)
    duration = video_meta['duration']
    fps = video_meta['fps']
    resolution = video_meta['resolution']
    
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
    audio_metrics, energy_curve = analyze_audio_file(audio_path, transcript_segments, language=language)

    # 2c. Vision Analytics (Sprint 3)
    from vision.analysis import analyze_frames
    # Pass the frames directory
    vision_metrics, frame_data_list = analyze_frames(frames_dir)
    
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

    # 3a. Export Raw Transcript (Roadmap Requirement)
    transcript_txt_path = os.path.join(session_dir, "transcript.txt")
    with open(transcript_txt_path, 'w', encoding='utf-8') as f:
        f.write("\n".join([t.text for t in transcript_segments]))
        
    # 3b. Generate Visualizations (Matplotlib)
    import matplotlib.pyplot as plt
    
    # Graph 1: Audio Energy (Prosody)
    if energy_curve:
        plt.figure(figsize=(10, 3))
        # Create time axis for energy (approx 10Hz = 0.1s steps)
        t_energy = [i * 0.1 for i in range(len(energy_curve))]
        plt.plot(t_energy, energy_curve, color='#FF5733', linewidth=1)
        plt.fill_between(t_energy, energy_curve, color='#FF5733', alpha=0.3)
        plt.title("Dynamique Vocale (Énergie/Volume)")
        plt.xlabel("Temps (s)")
        plt.ylabel("Amplitude (RMS)")
        plt.grid(True, linestyle=':', alpha=0.6)
        plt.tight_layout()
        plt.savefig(os.path.join(session_dir, "audio_energy.png"))
        plt.close()

    # Graph 2: Vision Timeline (Gure Gantt)
    if frame_data_list:
        plt.figure(figsize=(10, 4))
        
        # Extract series
        times = [d['frame_idx'] * 1.0 for d in frame_data_list] # Assuming 1 FPS extract
        face_vals = [1 if d['face_present'] else 0 for d in frame_data_list]
        eye_vals = [1 if d['eye_contact'] else 0 for d in frame_data_list]
        hand_vals = [1 if d['hands_visible'] else 0 for d in frame_data_list]
        
        # Plot bars (using scatter or broken_barh could be better, but step plot is easy)
        # Offset them vertically
        plt.step(times, [v * 3 for v in face_vals], where='mid', label='Visage', color='black', linewidth=2)
        plt.step(times, [v * 2 for v in eye_vals], where='mid', label='Regard Caméra', color='gray', linewidth=2)
        plt.step(times, [v * 1 for v in hand_vals], where='mid', label='Mains', color='lightgray', linewidth=2)
        
        plt.yticks([1, 2, 3], ['Mains', 'Regard', 'Visage'])
        plt.xlabel("Temps (secondes)")
        plt.title("Analyse Visuelle Temporelle")
        plt.grid(True, axis='x', linestyle='--', alpha=0.5)
        plt.ylim(0, 3.5)
        plt.tight_layout()
        plt.savefig(os.path.join(session_dir, "vision_timeline.png"))
        plt.close()
        
    # Generate Minimal Markdown Report (Sprint 1+2 Goal)
    md_report_path = os.path.join(session_dir, "report_minimal.md")
    with open(md_report_path, 'w', encoding='utf-8') as f:
        f.write((f"# Rapport SpeechCoach : {video_name}\n\n"))
        f.write((f"**Langue détectée** : {language.upper()}\n"))
        f.write((f"**Durée** : {duration:.2f} secondes\n"))
        f.write((f"**Résolution** : {resolution[0]}x{resolution[1]} @ {fps:.2f} fps\n"))
        
        # Calculate Execution Time & RTF
        total_time = time.time() - start_time
        rtf = total_time / duration if duration > 0 else 0
        minutes = int(total_time // 60)
        seconds = int(total_time % 60)
        f.write((f"**Temps de traitement** : {minutes}m {seconds}s ({total_time:.1f}s) (x{rtf:.2f} RTF)\n\n"))
        
        f.write("## Métriques Vocales (Audio)\n")
        f.write(f"- **Débit (WPM)** : {audio_metrics.wpm} mots/min ")
        if audio_metrics.wpm > 160: f.write("(Rapide)")
        elif audio_metrics.wpm < 110: f.write("(Lent)")
        else: f.write("(Bon rythme)")
        f.write("\n")
        
        f.write(f"- **Pauses (>0.5s)** : {audio_metrics.pause_count} pauses\n")
        f.write(f"- **Hésitations (Fillers)** : {audio_metrics.filler_count} détectées\n\n")
        
        f.write("### Dynamique Vocale\n")
        f.write("![Audio Energy](audio_energy.png)\n\n")

        f.write("\n")
        f.write("### Qualité & Environnement (Sprint 3)\n")
        f.write(f"- **Luminosité** : {vision_metrics.avg_brightness}/255 ")
        if vision_metrics.avg_brightness < 50: f.write("(Sombre 🌑)")
        elif vision_metrics.avg_brightness > 200: f.write("(Saturé ☀️)")
        else: f.write("(OK ✅)")
        f.write("\n")
        
        f.write(f"- **Netteté (Blur Score)** : {vision_metrics.avg_blur:.0f} ")
        if vision_metrics.avg_blur < 100: f.write("(Flou 🌫️)")
        else: f.write("(Net 📷)")
        f.write("\n\n")

        f.write("### Métriques Visuelles (Vision)\n")
        f.write(f"- **Présence Visage** : {vision_metrics.face_presence_ratio:.0%} du temps ")
        if vision_metrics.face_presence_ratio > 0.8: f.write("(OK)")
        elif vision_metrics.face_presence_ratio < 0.5: f.write("(Faible)")
        f.write("\n")
        
        f.write(f"- **Contact Visuel (Regard Caméra)** : {vision_metrics.eye_contact_ratio:.0%} ")
        if vision_metrics.eye_contact_ratio > 0.6: f.write("(Bonne connexion)")
        elif vision_metrics.eye_contact_ratio < 0.3: f.write("(Fuyant / Lecture notes)")
        else: f.write("(Moyen)")
        f.write("\n")
        
        f.write(f"- **Mains Visibles** : {vision_metrics.hands_visibility_ratio:.0%} du temps ")
        if vision_metrics.hands_visibility_ratio > 0.4: f.write("(OK)")
        elif vision_metrics.hands_visibility_ratio < 0.1: f.write("(Corps figé ?)")
        else: f.write("(Moyen)")
        f.write("\n")

        f.write(f"- **Intensité Gestuelle** : {vision_metrics.hands_activity_score}/10 ")
        if vision_metrics.hands_activity_score > 7: f.write("(Trop agité ?)")
        elif vision_metrics.hands_activity_score < 1: f.write("(Statique)")
        else: f.write("(Naturel)")
        f.write("\n\n")
        
        f.write("### Timeline Visuelle\n")
        f.write("![Vision Timeline](vision_timeline.png)\n\n")

        f.write("## Transcription\n\n")
        for seg in transcript_segments:
            f.write((f"- **[{seg.start:.1f}s - {seg.end:.1f}s]** : {seg.text}\n"))
            
    logger.info(f"Done! Report saved to: {report_path}")
    logger.info(f"Transcript exported to: {transcript_txt_path}")
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
