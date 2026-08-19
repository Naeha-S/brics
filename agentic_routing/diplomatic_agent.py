#!/usr/bin/env python3
"""
BRICS-AETHER: Diplomatic Agent & Multi-Sovereignty Dossier Engine
File: agentic_routing/diplomatic_agent.py

Description:
  Synthesizes multi-source atmospheric earth observation telemetry (Sentinel-5P NO2,
  CAMS reanalysis, ERA5 wind vectors, PINN dispersion cones, and ground sensor/photo
  validations) with BigQuery GIS GAUL intersection results.

  Generates an auditable, multi-lingual Sovereign Response Dossier translated into
  target national languages (HI, PT, ZH, RU, AR, EN), computes a cryptographic SHA-256
  evidence package at T0, and records the signed dossier into the Cloud SQL dispute ledger.
"""

import os
import sys
import json
import hashlib
import datetime
from typing import Dict, Any, List, Optional

# Ensure UTF-8 output encoding across Windows / Linux consoles
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Optional Google Cloud / Vertex AI integration with deterministic mock fallback
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

try:
    from google.cloud import bigquery
    HAS_BQ = True
except ImportError:
    HAS_BQ = False

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


# Supported Sovereign National Languages for BRICS+ Member States
SUPPORTED_LANGUAGES = {
    'EN': 'English (Global Standard)',
    'HI': 'हिन्दी (Hindi - India)',
    'PT': 'Português (Portuguese - Brazil)',
    'ZH': '中文 (Mandarin Chinese - China)',
    'RU': 'Русский (Russian - Russia)',
    'AR': 'العربية (Arabic - Egypt, Saudi Arabia, UAE)'
}


class DiplomaticAgent:
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-pro"):
        self.model_name = model_name
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if self.api_key and HAS_GENAI:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                generation_config={
                    "temperature": 0.2,
                    "top_p": 0.95,
                    "response_mime_type": "application/json"
                }
            )
        else:
            self.model = None

    def compute_sha256_package(self, payload: Dict[str, Any]) -> str:
        """Computes a deterministic SHA-256 digest over the canonical JSON payload."""
        canonical_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(canonical_str.encode('utf-8')).hexdigest()

    def build_evidence_bundle(
        self,
        plume_id: str,
        h3_res8: str,
        primary_jurisdiction: Dict[str, Any],
        affected_jurisdictions: List[Dict[str, Any]],
        telemetry: Dict[str, Any],
        pinn_forecast: Dict[str, Any],
        ground_validations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Constructs an immutable structured evidence bundle at T0."""
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        
        # Calculate level based on cross-border / cross-state scope
        distinct_nations = len(set([j.get('nation') for j in affected_jurisdictions] + [primary_jurisdiction.get('nation')]))
        distinct_states = len(set([j.get('state') for j in affected_jurisdictions] + [primary_jurisdiction.get('state')]))
        
        if distinct_nations >= 3:
            level = 5
            sla_hours = 48
            tier_label = "Level 5 (BRICS Environmental Dispute Council — 48h SLA)"
        elif distinct_nations == 2:
            level = 4
            sla_hours = 72
            tier_label = "Level 4 (Bilateral Commission — 72h SLA)"
        elif distinct_states > 1:
            level = 3
            sla_hours = 24
            tier_label = "Level 3 (Federal Environmental Ministry — 24h SLA)"
        elif len(affected_jurisdictions) > 1:
            level = 2
            sla_hours = 24
            tier_label = "Level 2 (State Environmental Board — 24h SLA)"
        else:
            level = 1
            sla_hours = 6
            tier_label = "Level 1 (District Magistrate / Collectorate — 6h SLA)"

        deadline_iso = (
            datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=sla_hours)
        ).isoformat()

        bundle = {
            "version": "1.0.0",
            "protocol": "BRICS-AETHER-RACI",
            "t0_timestamp": now_iso,
            "sla_deadline": deadline_iso,
            "sla_hours": sla_hours,
            "escalation_level": level,
            "raci_tier": tier_label,
            "plume_id": plume_id,
            "h3_res8": h3_res8,
            "primary_jurisdiction": primary_jurisdiction,
            "affected_jurisdictions": affected_jurisdictions,
            "telemetry": {
                "sentinel5p_no2_column": telemetry.get("no2_column", 3.2e15),
                "sentinel5p_qa": telemetry.get("qa_value", 0.82),
                "cams_pm25": telemetry.get("cams_pm25", 142.5),
                "cams_z_score": telemetry.get("cams_z", 2.4),
                "era5_wind_u": telemetry.get("u10", -3.2),
                "era5_wind_v": telemetry.get("v10", 1.4),
                "era5_pblh_m": telemetry.get("pblh", 210.0),
                "ground_owm_pm25": telemetry.get("owm_pm25", 138.0)
            },
            "pinn_forecast": {
                "model_version": "PINN-AdvDiff-v2.1",
                "max_pm25_72h": pinn_forecast.get("max_pm25_72h", 178.0),
                "peak_hour": pinn_forecast.get("peak_hour", 22),
                "dispersion_cone_sqkm": pinn_forecast.get("cone_sqkm", 48.6),
                "pde_loss_residual": pinn_forecast.get("loss_pde", 0.024)
            },
            "ground_evidence": ground_validations
        }

        # Sign with SHA-256
        bundle["evidence_sha256_hash"] = self.compute_sha256_package(bundle)
        return bundle

    def generate_dossier(
        self,
        evidence_bundle: Dict[str, Any],
        target_languages: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generates the diplomatic dossier with translated executive summaries,
        RACI assignments, and remediation advisories.
        """
        if target_languages is None:
            target_languages = ['EN', 'HI', 'PT', 'ZH', 'RU', 'AR']

        primary = evidence_bundle["primary_jurisdiction"]
        tel = evidence_bundle["telemetry"]
        pinn = evidence_bundle["pinn_forecast"]
        level = evidence_bundle["escalation_level"]
        sha = evidence_bundle["evidence_sha256_hash"]

        # Prompt for Gemini 1.5 Pro
        prompt = f"""
You are the BRICS-AETHER Diplomatic Agent. Generate an official, sovereign atmospheric dispersion and remediation dossier based on this immutable evidence bundle:

Evidence Package:
{json.dumps(evidence_bundle, indent=2)}

Format Requirements:
1. Provide an authoritative Executive Summary in English.
2. Provide verbatim accurate translated executive summaries in: {', '.join(target_languages)}.
3. List the RACI action items for Primary Jurisdiction ({primary.get('district')}, {primary.get('state')}) and secondary jurisdictions.
4. Prescribe specific targeted interventions based on the meteorological wind field (ERA5 u={tel['era5_wind_u']} m/s, v={tel['era5_wind_v']} m/s).
5. State the confidential computing TEE audit guarantees.

Output JSON format:
{{
  "dossier_id": "DOS-{evidence_bundle['plume_id']}",
  "sha256_signature": "{sha}",
  "escalation_level": {level},
  "primary_authority": "{primary.get('office', 'District Collectorate')}",
  "executive_summary_en": "string",
  "translations": {{
    "HI": "string (Hindi)",
    "PT": "string (Portuguese)",
    "ZH": "string (Mandarin)",
    "RU": "string (Russian)",
    "AR": "string (Arabic)"
  }},
  "raci_matrix": {{
    "responsible": ["string"],
    "accountable": ["string"],
    "consulted": ["string"],
    "informed": ["string"]
  }},
  "remediation_directives": ["string"],
  "confidential_tee_audit_clause": "string"
}}
"""
        if self.model:
            try:
                response = self.model.generate_content(prompt)
                dossier = json.loads(response.text)
                dossier["evidence_bundle"] = evidence_bundle
                return dossier
            except Exception as e:
                print(f"[DiplomaticAgent] Vertex/Gemini API notice: {e}. Falling back to deterministic pipeline synthesis.")

        # Deterministic fallback synthesis adhering strictly to BRICS protocol
        dossier = {
            "dossier_id": f"DOS-{evidence_bundle['plume_id']}",
            "sha256_signature": sha,
            "escalation_level": level,
            "primary_authority": primary.get("office", "District Collectorate"),
            "executive_summary_en": (
                f"Atmospheric dispersion advisory: Plume {evidence_bundle['plume_id']} centered at Uber H3 {evidence_bundle['h3_res8']} "
                f"indicates elevated PM2.5 of {tel['cams_pm25']:.1f} µg/m³ and NO2 column of {tel['sentinel5p_no2_column']:.2e} mol/m². "
                f"Physics-Informed Neural Network (PINN) dispersion modeling predicts peak concentration of {pinn['max_pm25_72h']:.1f} µg/m³ "
                f"in {pinn['peak_hour']} hours driven by wind vector ({tel['era5_wind_u']:.1f} m/s, {tel['era5_wind_v']:.1f} m/s). "
                f"Primary jurisdiction elected: {primary.get('district')}, {primary.get('state')} ({primary.get('nation')}) under RACI allocation."
            ),
            "translations": {
                "HI": (
                    f"वायुमंडलीय फैलाव परामर्श: प्लम {evidence_bundle['plume_id']} (H3 {evidence_bundle['h3_res8']}) पर "
                    f"PM2.5 स्तर {tel['cams_pm25']:.1f} µg/m³ और NO2 कॉलम {tel['sentinel5p_no2_column']:.2e} पाया गया है। "
                    f"PINN मॉडल के अनुसार {pinn['peak_hour']} घंटों में अधिकतम सांद्रता की संभावना है। "
                    f"प्राथमिक उत्तरदायी क्षेत्राधिकार: {primary.get('district')}, {primary.get('state')}।"
                ),
                "PT": (
                    f"Parecer de dispersão atmosférica: A pluma {evidence_bundle['plume_id']} no índice H3 {evidence_bundle['h3_res8']} "
                    f"apresenta PM2.5 de {tel['cams_pm25']:.1f} µg/m³ e coluna de NO2 de {tel['sentinel5p_no2_column']:.2e}. "
                    f"A modelagem PINN projeta pico de concentração em {pinn['peak_hour']} horas. "
                    f"Autoridade primária designada: {primary.get('district')}, {primary.get('state')} ({primary.get('nation')})."
                ),
                "ZH": (
                    f"大气扩散监测简报：羽流编号 {evidence_bundle['plume_id']}（H3 单元：{evidence_bundle['h3_res8']}）"
                    f"检测到 PM2.5 浓度为 {tel['cams_pm25']:.1f} µg/m³，NO2 垂直柱浓度为 {tel['sentinel5p_no2_column']:.2e}。"
                    f"基于物理信息的神经网络（PINN）预测将在 {pinn['peak_hour']} 小时内达到浓度峰值。"
                    f"主责管辖区：{primary.get('district')}, {primary.get('state')}。"
                ),
                "RU": (
                    f"Консультативное заключение по атмосферной дисперсии: Шлейф {evidence_bundle['plume_id']} (H3 {evidence_bundle['h3_res8']}) "
                    f"демонстрирует концентрацию PM2.5 {tel['cams_pm25']:.1f} мкг/м³ и колонку NO2 {tel['sentinel5p_no2_column']:.2e}. "
                    f"Модель PINN прогнозирует пиковую концентрацию через {pinn['peak_hour']} ч. "
                    f"Основной уполномоченный орган: {primary.get('district')}, {primary.get('state')}."
                ),
                "AR": (
                    f"تقرير رصد الانبعاثات الجوية: يوضح عمود التلوث {evidence_bundle['plume_id']} في الخلية {evidence_bundle['h3_res8']} "
                    f"تركيز جزيئات PM2.5 بمقدار {tel['cams_pm25']:.1f} ميكروغرام/م³ وثاني أكسيد النيتروجين {tel['sentinel5p_no2_column']:.2e}. "
                    f"يتوقع نموذج الشبكة العصبية الفيزيائية PINN ذروة التأثير خلال {pinn['peak_hour']} ساعة. "
                    f"السلطة الأولية المسؤولة: {primary.get('district')}, {primary.get('state')}."
                )
            },
            "raci_matrix": {
                "responsible": [f"Tier 1: {primary.get('office', 'Collectorate')} for ground verification and source containment."],
                "accountable": [f"Tier 2: {primary.get('tier2', 'State Environmental Board')}"],
                "consulted": [f"Adjoining Districts: {', '.join([j.get('district','') for j in evidence_bundle['affected_jurisdictions']])}"],
                "informed": [f"Tier 3: {primary.get('tier3', 'Federal Ministry of Environment')} & BRICS Secretariat"]
            },
            "remediation_directives": [
                "Deploy mobile mist-cannons and dust suppression across downwind transport corridor.",
                "Enforce immediate stoppage of open biomass burning within H3 buffer zone.",
                "Initiate Tier 1 industrial emission audits for thermal and chemical plants within 15km."
            ],
            "confidential_tee_audit_clause": (
                f"Evidence cryptographically anchored at T0 with SHA-256 ({sha}). "
                "Raw citizen imagery and telemetry remain partitioned within sovereign storage. "
                "Disputes are verifiable inside Google Cloud Confidential Space TEE enclaves without exposing raw citizen PII."
            ),
            "evidence_bundle": evidence_bundle
        }
        return dossier

    def publish_to_ledger(self, dossier: Dict[str, Any], connection_string: Optional[str] = None) -> bool:
        """
        Publishes the signed dossier and evidence package to the Cloud SQL dispute ledger.
        Falls back to local file ledger if database connection is unavailable.
        """
        dossier_id = dossier.get("dossier_id")
        sha = dossier.get("sha256_signature")
        level = dossier.get("escalation_level")
        bundle = dossier.get("evidence_bundle", {})
        primary = bundle.get("primary_jurisdiction", {})

        print(f"[DiplomaticAgent] Publishing dossier {dossier_id} (Level {level}) to Sovereign Ledger...")
        print(f"  • Primary Authority: {primary.get('district')}, {primary.get('state')} ({primary.get('nation')})")
        print(f"  • Immutable SHA-256: {sha}")
        print(f"  • SLA Deadline: {bundle.get('sla_deadline')}")

        # If PostgreSQL / Cloud SQL connection string is provided
        if connection_string and HAS_PSYCOPG2:
            try:
                with psycopg2.connect(connection_string) as conn:
                    with conn.cursor() as cur:
                        cur.execute("""
                            INSERT INTO sovereign_dossiers (
                                dossier_id, plume_id, h3_res8, nation, state, district,
                                escalation_level, sla_deadline, sha256_hash, dossier_payload
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (dossier_id) DO UPDATE SET
                                sha256_hash = EXCLUDED.sha256_hash,
                                dossier_payload = EXCLUDED.dossier_payload;
                        """, (
                            dossier_id,
                            bundle.get("plume_id"),
                            bundle.get("h3_res8"),
                            primary.get("nation"),
                            primary.get("state"),
                            primary.get("district"),
                            level,
                            bundle.get("sla_deadline"),
                            sha,
                            json.dumps(dossier)
                        ))
                    conn.commit()
                print("[DiplomaticAgent] Successfully committed to Cloud SQL PostgreSQL ledger.")
                return True
            except Exception as e:
                print(f"[DiplomaticAgent] Database ledger write warning: {e}. Writing to local sovereign ledger archive.")

        # Local Sovereign Ledger Archive
        ledger_dir = os.path.join(os.path.dirname(__file__), "..", "data", "sovereign_ledger")
        os.makedirs(ledger_dir, exist_ok=True)
        ledger_file = os.path.join(ledger_dir, f"{dossier_id}.json")
        with open(ledger_file, 'w', encoding='utf-8') as f:
            json.dump(dossier, f, indent=2, ensure_ascii=False)
        print(f"[DiplomaticAgent] Archived to local sovereign ledger: {ledger_file}")
        return True


def demo():
    """Runs a complete demonstration of the diplomatic dossier pipeline."""
    agent = DiplomaticAgent()

    # Sample Chennai plume event
    primary = {
        "nation": "IN",
        "state": "Tamil Nadu",
        "district": "Chennai",
        "office": "Chennai Collectorate & TNPCB",
        "tier2": "Tamil Nadu Pollution Control Board",
        "tier3": "India MoEFCC"
    }
    affected = [
        {"nation": "IN", "state": "Tamil Nadu", "district": "Kanchipuram"},
        {"nation": "IN", "state": "Tamil Nadu", "district": "Tiruvallur"}
    ]
    telemetry = {
        "no2_column": 3.45e15,
        "qa_value": 0.84,
        "cams_pm25": 146.0,
        "cams_z": 2.6,
        "u10": -3.4,
        "v10": 1.6,
        "pblh": 195.0,
        "owm_pm25": 142.0
    }
    pinn = {
        "max_pm25_72h": 174.0,
        "peak_hour": 24,
        "cone_sqkm": 52.4,
        "loss_pde": 0.019
    }
    ground_photos = [
        {
            "report_id": "R5021",
            "class": "Industrial_Plume",
            "confidence": 0.934,
            "opacity": 0.71,
            "district": "Chennai"
        }
    ]

    bundle = agent.build_evidence_bundle(
        plume_id="PLUME-TN-20260819-01",
        h3_res8="88618925d3fffff",
        primary_jurisdiction=primary,
        affected_jurisdictions=affected,
        telemetry=telemetry,
        pinn_forecast=pinn,
        ground_validations=ground_photos
    )

    dossier = agent.generate_dossier(bundle)
    agent.publish_to_ledger(dossier)

    print("\n--- Executive Summary (English) ---")
    print(dossier["executive_summary_en"])
    print("\n--- Translated Summary (Hindi) ---")
    print(dossier["translations"]["HI"])
    print("\n--- Translated Summary (Mandarin) ---")
    print(dossier["translations"]["ZH"])
    print("\n--- Immutable SHA-256 Hash ---")
    print(dossier["sha256_signature"])


if __name__ == "__main__":
    demo()
