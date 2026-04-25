import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "backend")))

from app.analytics.report_formatter import build_report_print_html

report = {
    'session': {'id': '123'},
    'summary': {},
    'scores': {},
    'metrics': {},
    'training_plan': {},
    'eq_metrics': {
        'version': 'v2',
        'scores': {'stress': 35, 'confidence': 79, 'articulation': 76},
        'objectives': {
            'stress': {'aspects': ['pauses', 'pitch']},
            'confidence': {'aspects': ['volume']},
            'articulation': {'aspects': ['speed']}
        },
        'reliability': {'overall': 0.85}
    }
}

html = build_report_print_html(report)
print("=== HTML ===")
print(html)
