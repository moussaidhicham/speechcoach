"""
Session status/tracker endpoints

Migrated from app/analytics/status_router.py in Phase 2
"""

import os
import shutil
import uuid as uuid_lib
from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from sqlmodel import delete, select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.models import AnalysisResult, CoachingFeedback, VideoSession
from app.reports.pdf import build_report_pdf
from app.reports.formatter import (
    build_report_markdown,
    build_report_print_html,
    build_report_response,
)
from app.auth.router import current_active_user
from app.db.database import get_session
from app.db.models import User
from app.utils.storage import STORAGE_BASE_DIR, STORAGE_URL_PREFIX

router = APIRouter()


async def _get_authorized_session(
    session_id: str,
    user: User,
    db: AsyncSession,
) -> VideoSession:
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail='Invalid session ID format') from error

    session = await db.get(VideoSession, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail='Not authorized to view this session')

    return session


async def _get_authorized_session_and_analysis(
    session_id: str,
    user: User,
    db: AsyncSession,
) -> tuple[VideoSession, AnalysisResult]:
    session = await _get_authorized_session(session_id, user, db)
    statement = select(AnalysisResult).where(AnalysisResult.video_session_id == session.id)
    result = await db.execute(statement)
    analysis = result.scalars().first()

    if not analysis:
        raise HTTPException(status_code=404, detail='Analysis result not ready yet')

    return session, analysis


async def _load_user_sessions_and_analyses(
    user_id: Any,
    db: AsyncSession,
) -> tuple[List[VideoSession], Dict[Any, AnalysisResult]]:
    statement = select(VideoSession).where(VideoSession.user_id == user_id).order_by(VideoSession.created_at.desc())
    result = await db.execute(statement)
    sessions = result.scalars().all()

    completed_session_ids = [session.id for session in sessions if session.status == 'completed']
    analyses_by_session_id: Dict[Any, AnalysisResult] = {}

    if completed_session_ids:
        analysis_stmt = select(AnalysisResult).where(AnalysisResult.video_session_id.in_(completed_session_ids))
        analysis_res = await db.execute(analysis_stmt)
        analyses = analysis_res.scalars().all()
        analyses_by_session_id = {analysis.video_session_id: analysis for analysis in analyses}

    return sessions, analyses_by_session_id


def _serialize_session_history_item(
    session: VideoSession,
    analysis: AnalysisResult | None,
) -> Dict[str, Any]:
    created_val = session.created_at.isoformat() if getattr(session, 'created_at', None) else datetime.now().isoformat()

    session_data: Dict[str, Any] = {
        'session_id': str(session.id),
        'title': session.title or f'Analyse #{str(session.id)[:8]}',
        'created_at': created_val,
        'status': session.status,
        'duration': session.duration_seconds,
        'video_url': session.video_url,
    }

    if analysis and analysis.metrics_json:
        metrics = analysis.metrics_json
        # Safely get overall_score from DB or default to 0
        raw_score = getattr(analysis, 'overall_score', 0)
        session_data['overall_score'] = int(raw_score) if raw_score is not None else 0
        
        session_data['wpm'] = round(metrics.get('audio_metrics', {}).get('wpm', 0))
        scores_metrics = metrics.get('scores', {})
        session_data['voice_score'] = round((scores_metrics.get('voice_score') or 0) * 10)
        session_data['body_language_score'] = round((scores_metrics.get('body_language_score') or 0) * 10)

        if not session_data['duration'] or session_data['duration'] == 0:
            session_data['duration'] = (
                metrics.get('metadata', {}).get('duration_seconds', 0)
                or metrics.get('audio_metrics', {}).get('total_duration', 0)
                or metrics.get('audio_metrics', {}).get('duration', 0)
            )

        if session_data['duration']:
            session_data['duration'] = round(session_data['duration'])

    return session_data


def _build_dashboard_coaching_snapshot(report: Dict[str, Any]) -> Dict[str, Any]:
    strengths = report.get('strengths') or []
    training_plan = report.get('training_plan') or {}
    summary = report.get('summary') or {}
    
    # Priority for new AI-generated exercises
    next_practice_title = summary.get('exercice_titre')
    next_practice_step = summary.get('exercice_consigne')

    # Fallback to legacy training plan if AI fields are missing
    if not next_practice_title:
        first_day = (training_plan.get('days') or [None])[0] or {}
        next_practice_title = first_day.get('title')
        next_practice_step = (first_day.get('items') or [None])[0]

    return {
        'session_id': report.get('session', {}).get('id', ''),
        'title': report.get('session', {}).get('title', 'Rapport'),
        'created_at': report.get('session', {}).get('created_at', ''),
        'overall_score': summary.get('overall_score', 0),
        'headline': summary.get('headline', ''),
        'priority_focus': summary.get('priority_focus', 'Progression générale'),
        'description': summary.get('narrative', ''), # Map narrative to description for frontend
        'bilan': summary.get('narrative', ''),
        'encouragement': summary.get('encouragement'),
        'primary_focus': training_plan.get('focus_primary') or summary.get('priority_focus', 'Progression générale'),
        'first_strength': strengths[0] if strengths else None,
        'next_practice_title': next_practice_title,
        'next_practice_step': next_practice_step,
    }


def _build_dashboard_summary_payload(
    sessions: List[VideoSession],
    analyses_by_session_id: Dict[Any, AnalysisResult],
) -> Dict[str, Any]:
    history_entries = [
        _serialize_session_history_item(session, analyses_by_session_id.get(session.id))
        for session in sessions
    ]

    completed_entries = [
        item for item in history_entries if item.get('status') == 'completed' and item.get('overall_score') is not None
    ]

    average_score = (
        round(sum(item.get('overall_score', 0) for item in completed_entries) / len(completed_entries))
        if completed_entries
        else 0
    )
    best_score = max((item.get('overall_score', 0) for item in completed_entries), default=0)
    total_practice_minutes = round(sum(item.get('duration', 0) or 0 for item in history_entries) / 60)
    progress_chart = [
        {
            'created_at': item.get('created_at', ''),
            'score': item.get('overall_score', 0),
            'wpm': item.get('wpm', 0),
        }
        for item in sorted(completed_entries, key=lambda current: current.get('created_at', ''))
    ]

    latest_coaching = None
    for session in sessions:
        if session.status != 'completed':
            continue
        analysis = analyses_by_session_id.get(session.id)
        if analysis is None:
            continue
        report = build_report_response(session, analysis)
        latest_coaching = _build_dashboard_coaching_snapshot(report)
        break

    return {
        'total_sessions': len(history_entries),
        'completed_sessions': len(completed_entries),
        'average_score': average_score,
        'best_score': best_score,
        'total_practice_minutes': total_practice_minutes,
        'recent_sessions': history_entries[:5],
        'progress_chart': progress_chart,
        'latest_coaching': latest_coaching,
    }


@router.get('/status/{session_id}')
async def get_session_status(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    session = await _get_authorized_session(session_id, user, db)
    return {
        'session_id': str(session.id),
        'status': session.status,
        'current_step': session.current_step,
        'progress_percent': session.progress_percent,
        'duration_seconds': session.duration_seconds,
        'processing_started_at': (session.processing_started_at.isoformat() + 'Z') if session.processing_started_at else None,
    }


@router.get('/dashboard-summary')
async def get_dashboard_summary(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    sessions, analyses_by_session_id = await _load_user_sessions_and_analyses(user.id, db)
    return _build_dashboard_summary_payload(sessions, analyses_by_session_id)


@router.get('/result/{session_id}')
async def get_session_result(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    session, analysis = await _get_authorized_session_and_analysis(session_id, user, db)
    return build_report_response(session, analysis)


@router.get('/report/{session_id}/markdown')
async def export_report_markdown(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    session, analysis = await _get_authorized_session_and_analysis(session_id, user, db)
    report = build_report_response(session, analysis)
    markdown = build_report_markdown(report)
    filename = report.get('session', {}).get('title', f'report-{session_id}')
    safe_filename = ''.join(char if char.isalnum() or char in ('-', '_') else '-' for char in filename.lower()).strip('-') or f'report-{session_id}'

    return Response(
        content=markdown,
        media_type='text/markdown; charset=utf-8',
        headers={
            'Content-Disposition': f'attachment; filename="{safe_filename}.md"',
        },
    )


@router.get('/report/{session_id}/print', response_class=HTMLResponse)
async def export_report_print_html(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    session, analysis = await _get_authorized_session_and_analysis(session_id, user, db)
    report = build_report_response(session, analysis)
    html = build_report_print_html(report)
    return HTMLResponse(content=html)


@router.get('/report/{session_id}/pdf')
async def export_report_pdf(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    session, analysis = await _get_authorized_session_and_analysis(session_id, user, db)
    report = build_report_response(session, analysis)
    filename = report.get('session', {}).get('title', f'report-{session_id}')
    safe_filename = ''.join(char if char.isalnum() or char in ('-', '_') else '-' for char in filename.lower()).strip('-') or f'report-{session_id}'

    try:
        pdf_bytes = build_report_pdf(report)
    except RuntimeError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error

    return Response(
        content=pdf_bytes,
        media_type='application/pdf',
        headers={
            'Content-Disposition': f'attachment; filename="{safe_filename}.pdf"',
        },
    )


@router.get('/history')
async def get_session_history(
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    sessions, analyses_by_session_id = await _load_user_sessions_and_analyses(user.id, db)
    return [
        _serialize_session_history_item(session, analyses_by_session_id.get(session.id))
        for session in sessions
    ]


@router.delete('/session/{session_id}')
async def delete_session(
    session_id: str,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail='Invalid session ID format') from error

    session = await db.get(VideoSession, session_uuid)
    if not session:
        raise HTTPException(status_code=404, detail='Session not found')

    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail='Not authorized to delete this session')

    base_storage = STORAGE_BASE_DIR

    if session.video_url and session.video_url.startswith(STORAGE_URL_PREFIX):
        rel_path = session.video_url.replace(f'{STORAGE_URL_PREFIX}/', '')
        abs_path = os.path.join(base_storage, rel_path)
        if os.path.exists(abs_path):
            try:
                os.remove(abs_path)
            except Exception as error:
                print(f'Failed to delete video file: {error}')

    processing_dir = os.path.join(STORAGE_BASE_DIR, 'processing', str(session.id))
    if os.path.exists(processing_dir):
        try:
            shutil.rmtree(processing_dir)
        except Exception as error:
            print(f'Failed to delete processing dir: {error}')

    analysis_ids_stmt = select(AnalysisResult.id).where(AnalysisResult.video_session_id == session.id)
    analysis_ids_res = await db.execute(analysis_ids_stmt)
    analysis_ids = analysis_ids_res.scalars().all()

    if analysis_ids:
        feedback_stmt = delete(CoachingFeedback).where(CoachingFeedback.analysis_result_id.in_(analysis_ids))
        await db.execute(feedback_stmt)

    result_stmt = delete(AnalysisResult).where(AnalysisResult.video_session_id == session.id)
    await db.execute(result_stmt)

    await db.delete(session)
    await db.commit()

    return {'status': 'deleted', 'session_id': session_id}


class SessionUpdate(BaseModel):
    title: str


@router.patch('/session/{session_id}')
async def update_session(
    session_id: str,
    update_data: SessionUpdate,
    user: User = Depends(current_active_user),
    db: AsyncSession = Depends(get_session),
):
    try:
        session_uuid = uuid_lib.UUID(session_id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail='Invalid session ID format') from error

    session = await db.get(VideoSession, session_uuid)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail='Session not found')

    session.title = update_data.title
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return {'status': 'updated', 'session_id': session_id, 'title': session.title}

__all__ = ["router"]
