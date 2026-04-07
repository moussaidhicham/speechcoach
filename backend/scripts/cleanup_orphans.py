import argparse
import os
import shutil
import sys
from pathlib import Path

from sqlmodel import select


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.analytics.models import AnalysisResult, CoachingFeedback, VideoSession
from app.db.database import SessionLocal


STORAGE_DIR = BACKEND_DIR / "app" / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
PROCESSING_DIR = STORAGE_DIR / "processing"


def _session_processing_dirs(existing_session_ids: set[str]) -> tuple[list[Path], list[Path]]:
    valid_dirs: list[Path] = []
    orphan_dirs: list[Path] = []
    if not PROCESSING_DIR.exists():
        return valid_dirs, orphan_dirs

    for child in PROCESSING_DIR.iterdir():
        if not child.is_dir():
            continue
        if child.name in existing_session_ids:
            valid_dirs.append(child)
        else:
            orphan_dirs.append(child)
    return valid_dirs, orphan_dirs


def _session_upload_files(existing_video_urls: set[str]) -> tuple[list[Path], list[Path]]:
    valid_files: list[Path] = []
    orphan_files: list[Path] = []
    if not UPLOADS_DIR.exists():
        return valid_files, orphan_files

    referenced_names = {url.split("/")[-1] for url in existing_video_urls if url.startswith("/storage/uploads/")}
    for child in UPLOADS_DIR.iterdir():
        if not child.is_file():
            continue
        if child.name in referenced_names:
            valid_files.append(child)
        else:
            orphan_files.append(child)
    return valid_files, orphan_files


def main() -> int:
    parser = argparse.ArgumentParser(description="Clean orphan DB rows and stray storage artifacts.")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually delete orphan rows/files. Without this flag, the script only reports what it found.",
    )
    args = parser.parse_args()

    with SessionLocal() as db:
        sessions = db.exec(select(VideoSession)).all()
        analyses = db.exec(select(AnalysisResult)).all()
        coachings = db.exec(select(CoachingFeedback)).all()

        session_ids = {str(session.id) for session in sessions}
        session_ids_uuid = {session.id for session in sessions}
        analysis_ids = {analysis.id for analysis in analyses}
        video_urls = {session.video_url for session in sessions if session.video_url}

        orphan_analyses = [analysis for analysis in analyses if analysis.video_session_id not in session_ids_uuid]
        orphan_coachings = [coaching for coaching in coachings if coaching.analysis_result_id not in analysis_ids]

        _, orphan_processing_dirs = _session_processing_dirs(session_ids)
        _, orphan_upload_files = _session_upload_files(video_urls)

        print("Cleanup report")
        print(f"- orphan analysis rows: {len(orphan_analyses)}")
        print(f"- orphan coaching rows: {len(orphan_coachings)}")
        print(f"- orphan processing dirs: {len(orphan_processing_dirs)}")
        print(f"- orphan upload files: {len(orphan_upload_files)}")

        for analysis in orphan_analyses:
            print(f"  analysis orphan: {analysis.id} -> missing session {analysis.video_session_id}")
        for coaching in orphan_coachings:
            print(f"  coaching orphan: {coaching.id} -> missing analysis {coaching.analysis_result_id}")
        for path in orphan_processing_dirs:
            print(f"  processing dir orphan: {path}")
        for path in orphan_upload_files:
            print(f"  upload file orphan: {path}")

        if not args.apply:
            print("\nDry run only. Re-run with --apply to delete these items.")
            return 0

        for coaching in orphan_coachings:
            db.delete(coaching)
        for analysis in orphan_analyses:
            db.delete(analysis)
        db.commit()

        for path in orphan_processing_dirs:
            shutil.rmtree(path, ignore_errors=True)
        for path in orphan_upload_files:
            try:
                path.unlink(missing_ok=True)
            except TypeError:
                if path.exists():
                    path.unlink()

        print("\nCleanup applied.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
