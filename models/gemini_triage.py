#!/usr/bin/env python3
"""
BRICS-AETHER — Gemini 1.5 Flash Vision Triage Module
Location: models/gemini_triage.py

Fuses citizen photos and multilingual text captions to classify pollution sources,
estimate plume opacity (0-100), extract bounding boxes, and enforce the Ci >= 0.70
confidence gating policy before generating an immutable SHA-256 evidence record.
"""

import os
import sys
import json
import base64
import hashlib
import argparse
from typing import Dict, Any, Optional, Union
from pathlib import Path
from dataclasses import dataclass, asdict

# Target classes
CLASSES = [
    "stubble_burning",
    "industrial_plume",
    "vehicle_smog",
    "dust_storm",
    "clear",
    "cloud",
]

CONFIDENCE_THRESHOLD = 0.70

SYSTEM_INSTRUCTION = """You are VAYU Vision, a pollution source classifier for BRICS citizen photos. You work on Google Cloud Vertex AI, integrated with CAMS/ERA5 satellite checks. Be precise, conservative, and auditable.

TASK: Given a citizen photo (and optional translated caption), classify the dominant pollution source.

CLASSES (choose one):
- stubble_burning: open field fire, paddy straw burning, smoke from cropland
- industrial_plume: factory/chimney plume, chemical plant, brick kiln emission
- vehicle_smog: traffic smog, road haze, exhaust-heavy air
- dust_storm: dust, sandstorm, construction dust, unpaved road dust
- clear: no pollution visible, blue sky, light haze only
- cloud: clouds mistaken for smoke (low confidence -> choose this, not plume)

OUTPUT: JSON only, no markdown:
{
  "class": "<one of above>",
  "confidence": 0.0-1.0,
  "opacity_0_100": 0-100,
  "plume_bbox": [x_min,y_min,x_max,y_max] in 0-1000 coords or null if clear/cloud,
  "reasoning": "1 sentence, citing visual evidence: color, texture, source geometry, density",
  "language_hint": "detected caption language if present or null",
  "needs_human_review": true/false
}

RULES:
- If smoke but no clear source, prefer vehicle_smog or dust_storm based on context (urban vs arid).
- Opacity: 0=clear, 100=opaque. Estimate haze density ignoring sky.
- If confidence <0.70, set class to clear and needs_human_review=true.
- Never hallucinate fire if not visible; describe what you see."""


@dataclass
class TriageResult:
    classification: str
    confidence: float
    opacity_0_100: int
    plume_bbox: Optional[list]
    reasoning: str
    language_hint: Optional[str]
    needs_human_review: bool
    evidence_sha256: str
    source_model: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class GeminiVisionTriage:
    """Triage engine utilizing Vertex AI Gemini 1.5 Flash or API Key fallback."""

    def __init__(self, project_id: Optional[str] = None, location: str = "asia-south1", api_key: Optional[str] = None):
        self.project_id = project_id or os.getenv("GOOGLE_CLOUD_PROJECT") or os.getenv("EE_PROJECT") or "brics-506015"
        self.location = location or os.getenv("VERTEX_LOCATION", "asia-south1")
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-1.5-flash"
        self._init_client()

    def _init_client(self):
        self.mode = "mock"
        
        # 1. Try Vertex AI
        if os.getenv("GOOGLE_APPLICATION_CREDENTIALS") or os.path.exists("ee-service-account.json"):
            try:
                import vertexai
                from vertexai.generative_models import GenerativeModel
                vertexai.init(project=self.project_id, location=self.location)
                self.vertex_model = GenerativeModel(self.model_name, system_instruction=[SYSTEM_INSTRUCTION])
                self.mode = "vertex"
                return
            except Exception:
                pass

        # 2. Try google.generativeai with API key
        if self.api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.api_key)
                self.genai_model = genai.GenerativeModel(self.model_name, system_instruction=SYSTEM_INSTRUCTION)
                self.mode = "genai"
                return
            except Exception:
                pass

    def triage_image(
        self,
        image_bytes: bytes,
        caption: Optional[str] = None,
        mime_type: str = "image/jpeg"
    ) -> TriageResult:
        """Classifies a citizen photo and generates an immutable SHA-256 hash."""
        sha = hashlib.sha256(image_bytes).hexdigest()

        if self.mode == "vertex":
            from vertexai.generative_models import Part
            prompt_parts = [Part.from_data(data=image_bytes, mime_type=mime_type)]
            if caption:
                prompt_parts.append(f"Citizen Caption: {caption}")
            else:
                prompt_parts.append("Analyze this photo for pollution sources.")
            
            response = self.vertex_model.generate_content(
                prompt_parts,
                generation_config={"response_mime_type": "application/json", "temperature": 0.2}
            )
            raw_text = response.text
            return self._parse_response(raw_text, sha, source_model=f"Vertex AI {self.model_name}")

        elif self.mode == "genai":
            prompt_parts = [{"mime_type": mime_type, "data": image_bytes}]
            if caption:
                prompt_parts.append(f"Citizen Caption: {caption}")
            else:
                prompt_parts.append("Analyze this photo for pollution sources.")

            response = self.genai_model.generate_content(
                prompt_parts,
                generation_config={"response_mime_type": "application/json", "temperature": 0.2}
            )
            raw_text = response.text
            return self._parse_response(raw_text, sha, source_model=f"Google GenAI {self.model_name}")

        else:
            # Deterministic simulation for local dry-run without active cloud quotas
            return self._simulated_triage(image_bytes, caption, sha)

    def _parse_response(self, raw_text: str, sha: str, source_model: str) -> TriageResult:
        try:
            # Clean possible markdown wrapping
            text = raw_text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            data = json.loads(text.strip())

            classification = data.get("class", "clear")
            confidence = float(data.get("confidence", 0.0))
            opacity = int(data.get("opacity_0_100", 0))
            bbox = data.get("plume_bbox")
            reasoning = data.get("reasoning", "Classified via Gemini Vision.")
            lang = data.get("language_hint")

            needs_review = confidence < CONFIDENCE_THRESHOLD or data.get("needs_human_review", False)
            if confidence < CONFIDENCE_THRESHOLD:
                classification = "clear"

            return TriageResult(
                classification=classification,
                confidence=confidence,
                opacity_0_100=opacity,
                plume_bbox=bbox,
                reasoning=reasoning,
                language_hint=lang,
                needs_human_review=needs_review,
                evidence_sha256=sha,
                source_model=source_model
            )
        except Exception as e:
            return TriageResult(
                classification="clear",
                confidence=0.5,
                opacity_0_100=0,
                plume_bbox=None,
                reasoning=f"Parsing error ({str(e)}), queued for manual inspection.",
                language_hint=None,
                needs_human_review=True,
                evidence_sha256=sha,
                source_model=f"{source_model} (Fallback)"
            )

    def _simulated_triage(self, image_bytes: bytes, caption: Optional[str], sha: str) -> TriageResult:
        """Deterministic rule-based mock for testing and demonstration."""
        cap = (caption or "").lower()
        if any(w in cap for w in ["fire", "stubble", "khet", "parali", "paddy", "straw"]):
            cls = "stubble_burning"
            conf = 0.94
            op = 76
            bbox = [140, 280, 860, 720]
            reason = "Dense low-lying grey-white smoke spreading horizontally across agricultural fields."
        elif any(w in cap for w in ["factory", "chimney", "stack", "industrial", "mill"]):
            cls = "industrial_plume"
            conf = 0.91
            op = 82
            bbox = [420, 110, 610, 680]
            reason = "Continuous vertical stack emission with high opacity at source."
        elif any(w in cap for w in ["traffic", "vehicle", "bus", "car", "smog"]):
            cls = "vehicle_smog"
            conf = 0.88
            op = 64
            bbox = [80, 450, 920, 890]
            reason = "Ambient grey-brown vehicular haze layer across urban arterial corridor."
        elif any(w in cap for w in ["dust", "sand", "construction"]):
            cls = "dust_storm"
            conf = 0.86
            op = 58
            bbox = [100, 200, 900, 800]
            reason = "Yellow-brown particulate dispersion consistent with ground-level dust disturbance."
        else:
            cls = "industrial_plume"
            conf = 0.89
            op = 72
            bbox = [350, 120, 680, 740]
            reason = "Identified localized plume column with elevated opacity against background sky."

        return TriageResult(
            classification=cls,
            confidence=conf,
            opacity_0_100=op,
            plume_bbox=bbox,
            reasoning=reason,
            language_hint="en-IN" if caption else None,
            needs_human_review=(conf < CONFIDENCE_THRESHOLD),
            evidence_sha256=sha,
            source_model="Gemini 1.5 Flash (Offline/Simulation Mode)"
        )


def main():
    parser = argparse.ArgumentParser(description="BRICS-AETHER Gemini 1.5 Flash Vision Triage")
    parser.add_argument("--image", type=str, help="Path to citizen photo (JPEG/PNG)")
    parser.add_argument("--caption", type=str, default=None, help="Optional citizen text caption")
    parser.add_argument("--project", type=str, default=None, help="GCP Project ID")
    parser.add_argument("--dry-run", action="store_true", help="Run simulated test triage without cloud API call")
    args = parser.parse_args()

    triage = GeminiVisionTriage(project_id=args.project)

    if args.image and os.path.exists(args.image):
        with open(args.image, "rb") as f:
            data = f.read()
    else:
        # Synthetic sample payload
        data = b"VAYU_SAMPLE_CITIZEN_PHOTO_PAYLOAD_CHENNAI_TAMILNADU_2026"

    caption = args.caption or "Stubble burning observed near rural highway field"
    result = triage.triage_image(data, caption=caption)

    print("\n" + "=" * 60)
    print("BRICS-AETHER CITIZEN PHOTO TRIAGE REPORT (GEMINI 1.5 FLASH)")
    print("=" * 60)
    print(json.dumps(result.to_dict(), indent=2))
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
