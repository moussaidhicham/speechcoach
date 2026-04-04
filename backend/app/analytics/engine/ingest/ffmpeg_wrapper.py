import ffmpeg
import os
import sys
import logging
from typing import Any, Optional

# Configure logger
logger = logging.getLogger(__name__)


def _safe_int(value: Any) -> Optional[int]:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def _safe_float(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _parse_frame_rate(value: Any) -> float:
    if value in (None, '', '0/0'):
        return 0.0
    if isinstance(value, str) and '/' in value:
        try:
            numerator, denominator = value.split('/', 1)
            denominator_value = float(denominator)
            if denominator_value == 0:
                return 0.0
            return float(numerator) / denominator_value
        except (TypeError, ValueError, ZeroDivisionError):
            return 0.0
    parsed = _safe_float(value)
    return parsed if 0 < parsed <= 240 else 0.0

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
        # ffmpeg -i video.mp4 -acodec pcm_s16le -ac 1 -ar 16000 output.wav
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
            .filter('scale', 640, 360) # Downscale for faster MediaPipe processing
            .output(output_pattern, qscale=2, preset='ultrafast')
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

def get_video_metadata(video_path: str) -> dict:
    """
    Returns dict with duration, fps, resolution (width, height).
    """
    try:
        probe = ffmpeg.probe(video_path)
        video_streams = [stream for stream in probe.get('streams', []) if stream.get('codec_type') == 'video']
        video_stream = next(
            (
                stream for stream in video_streams
                if _safe_int(stream.get('width')) and _safe_int(stream.get('height'))
            ),
            video_streams[0] if video_streams else None,
        )
        
        if not video_stream:
            return {"duration": 0.0, "fps": 0.0, "resolution": (0, 0)}

        width = _safe_int(video_stream.get('width')) or 0
        height = _safe_int(video_stream.get('height')) or 0
        
        fps = _parse_frame_rate(video_stream.get('avg_frame_rate')) or _parse_frame_rate(video_stream.get('r_frame_rate'))
            
        # Duration fallback: check stream if format['duration'] is missing
        duration = 0.0
        if 'duration' in probe.get('format', {}):
            duration = _safe_float(probe['format']['duration'])
        elif 'duration' in video_stream:
            duration = _safe_float(video_stream['duration'])
        elif 'tags' in video_stream and 'DURATION' in video_stream['tags']:
            # Some FFmpeg probes return DURATION as a string tag
            dur_str = video_stream['tags']['DURATION']
            if ':' in dur_str: # HH:MM:SS.ms
                parts = dur_str.split(':')
                duration = float(parts[0])*3600 + float(parts[1])*60 + float(parts[2])
            else:
                duration = _safe_float(dur_str)

        if fps <= 1.0 and duration > 0:
            nb_frames = _safe_float(video_stream.get('nb_frames'))
            if nb_frames > 0:
                derived_fps = nb_frames / duration
                if 1.0 < derived_fps <= 240:
                    fps = derived_fps

        return {
            "duration": duration,
            "fps": fps,
            "resolution": (width, height)
        }
    except Exception as e:
        logger.error(f"Error probing video metadata: {e}")
        return {"duration": 0.0, "fps": 0.0, "resolution": (0, 0)}
