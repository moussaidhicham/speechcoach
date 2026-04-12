import json
import os
import sys
import re
from typing import List, Dict, Any

# Add backend to path to import schemas
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.analytics.engine.metrics.schema import Scores, Recommendation

def validate_row(row: Dict[str, Any]):
    """
    Validates a single row of the dataset.
    Input structure: {"input": "Score global: ...\n...", "target": {"bilan_global": "...", "point_prioritaire": "...", "encouragement": "..."}}
    """
    if "input" not in row or "target" not in row:
        return False, "Missing 'input' or 'target' keys."
    
    inp_text = row["input"]
    if not isinstance(inp_text, str) or "Score global:" not in inp_text:
        return False, "Input must be a formatted string starting with 'Score global'."

    # 1. Basic Data Extraction from String
    try:
        # Extract overall score
        score_line = [l for l in inp_text.split("\n") if "Score global:" in l][0]
        overall_score = float(score_line.split(":")[1].strip())
        
        # Extract actionable tip for consistency check
        tip_line = [l for l in inp_text.split("\n") if "Conseil actionnable:" in l][0]
        actionable_tip = tip_line.split(":")[1].strip()
    except Exception as e:
        return False, f"Failed to extract metrics from input string: {str(e)}"

    # 2. Schema Validation (Target)
    target = row["target"]
    required_target_keys = ["bilan_global", "point_prioritaire", "encouragement"]
    for key in required_target_keys:
        if key not in target or not isinstance(target[key], str) or len(target[key]) < 10:
            return False, f"Target key '{key}' is missing or too short."

    # 3. Consistency Check (Score vs Tone)
    bilan = target["bilan_global"].lower()
    
    # Critical threshold check
    if overall_score < 40:
        negative_words = ["fragile", "difficulte", "urgent", "priorite", "travail", "axes", "ameliorer", "faible", "bas"]
        if not any(word in bilan for word in negative_words):
             return False, f"Score is low ({overall_score}) but bilan seems too positive."
             
    # Success threshold check
    if overall_score > 80:
        positive_words = ["excellent", "solide", "maitrise", "fort", "reussi", "bravo", "tres bien", "satisfaisant"]
        if not any(word in bilan for word in positive_words):
             return False, f"Score is high ({overall_score}) but bilan lacks positive reinforcement."

    # 4. Actionable alignment
    priority = target["point_prioritaire"].lower()
    tip = actionable_tip.lower()
    # Simple keyword check
    tip_keywords = [w for w in re.findall(r"\w+", tip) if len(w) > 4][:5]
    if tip_keywords and not any(kw in priority for kw in tip_keywords):
        return False, f"Priority statement does not seem to align with engine tip: '{tip}'"

    return True, "OK"

def validate_dataset(file_path: str):
    print(f"Starting validation for: {file_path}")
    if not os.path.exists(file_path):
        print("Error: File not found.")
        return

    valid_count = 0
    total_count = 0
    with open(file_path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if not line.strip(): continue
            total_count += 1
            try:
                row = json.loads(line)
                is_valid, msg = validate_row(row)
                if not is_valid:
                    print(f"Row {i+1} INVALID: {msg}")
                else:
                    valid_count += 1
            except Exception as e:
                print(f"Row {i+1} CRASHED: {str(e)}")
    
    print(f"\nSummary: {valid_count}/{total_count} rows are valid.")
    return valid_count == total_count

if __name__ == "__main__":
    if len(sys.argv) > 1:
        validate_dataset(sys.argv[1])
    else:
        print("Usage: python dataset_validator.py <path_to_jsonl>")
