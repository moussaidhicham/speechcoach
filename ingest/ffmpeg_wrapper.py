import ffmpeg
import os
import sys
import logging

# Configure logger
logger = logging.getLogger(__name__)

def extract_audio(video_path: str, output_wav_path: str) -> bool:
    """
    Extracts audio from video and converts it to 16kHz mono WAV (Whisper friendly).
    """
    try:
        if os.path.exists(output_wav_path):
            logger.info(f"Audio file already exists: {output_wav_path}")
            return True

        logger.info(f"Extracting audio from {video_path} to {output_wav_path}...")
        (
            ffmpeg
            .input(video_path)
            .output(output_wav_path, acodec='pcm_s16le', ac=1, ar='16000')
            .overwrite_output()
            .run(quiet=True)
        )
        return True
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg error extracting audio: {e.stderr.decode('utf8') if e.stderr else str(e)}")
        return False

def extract_frames(video_path: str, output_dir: str, fps: float = 1.0) -> bool:
    """
    Extract frames from video at a specified frame rate.
    """
    try:
        os.makedirs(output_dir, exist_ok=True)
        
        # Check if frames already exist (simple check: is directory not empty?)
        if os.listdir(output_dir):
            logger.info(f"Frames directory not empty, skipping extraction: {output_dir}")
            return True

        logger.info(f"Extracting frames from {video_path} to {output_dir} at {fps} fps...")
        
        # Pattern: frame_0001.jpg
        output_pattern = os.path.join(output_dir, "frame_%04d.jpg")
        
        (
            ffmpeg
            .input(video_path)
            .filter('fps', fps=fps)
            .output(output_pattern, qscale=2) # qscale 2 = high quality jpg
            .overwrite_output()
            .run(quiet=True)
        )
        return True
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg error extracting frames: {e.stderr.decode('utf8') if e.stderr else str(e)}")
        return False
        
def get_video_duration(video_path: str) -> float:
    try:
        probe = ffmpeg.probe(video_path)
        return float(probe['format']['duration'])
    except Exception as e:
        logger.error(f"Error probing video duration: {e}")
        return 0.0
