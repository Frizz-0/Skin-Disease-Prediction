import os
import json
import logging
# from pathlib import Path
from dotenv import load_dotenv
from groq import AsyncGroq

# env_path = Path(__file__).resolve().parent / ".env"
# load_dotenv(dotenv_path=env_path)
load_dotenv()

logger = logging.getLogger(__name__)

GROQ_VLM_MODEL = "qwen/qwen3.8-27b"


async def generate_vlm_clinical_report(
    image_base64: str,
    diagnosis: str,
    confidence: int,
    top_differentials: list[str],
    erythema_index: float = 0.0,
    fitzpatrick_type: int | None = None,
    body_location: str = "Unspecified",
    duration: str = "Unspecified",
    patient_symptoms: list[str] | None = None,
) -> dict:
    """
    Calls Groq VLM to generate a clinically accurate yet easy-to-understand
    report pairing medical terms with everyday English explanations.
    """
    api_key = os.getenv("Groq_api")
    if not api_key:
        raise ValueError("Groq_api environment variable is not set.")

    client = AsyncGroq(api_key=api_key)

    image_url = (
        image_base64
        if image_base64.startswith("data:image")
        else f"data:image/jpeg;base64,{image_base64}"
    )

    symptoms_str = ", ".join(patient_symptoms) if patient_symptoms else "None reported"

    system_prompt = (
        "You are a helpful dermatology AI assistant explaining a skin scan to a everyday patient while keeping medical accuracy. "
        "CRITICAL WRITING RULE: Whenever you use a medical or technical term, you MUST immediately explain it in simple, normal English in parentheses. "
        "NEVER put another medical word inside the parentheses. Write short, clear, natural sentences that anyone can understand.\n\n"
        "EXAMPLES OF THE REQUIRED TONE:\n"
        "- BAD: 'Erythematous inflammatory papules and pustules with central purulence.'\n"
        "- GOOD: 'Erythematous papules and pustules (red, swollen bumps and small whiteheads) across the cheek and jawline.'\n"
        "- BAD: 'Follicular hyperkeratosis leading to microcomedone formation and lymphocytic infiltration.'\n"
        "- GOOD: 'Follicular hyperkeratosis (a buildup of dead skin cells and oil that blocks hair pores), which traps skin bacteria and causes localized redness and swelling.'\n"
        "- BAD: 'Visible follicular plugging (comedones)'\n"
        "- GOOD: 'Comedones (clogged pores, such as blackheads and whiteheads)'\n\n"
        "Return ONLY a valid JSON object matching the exact schema requested."
    )

    user_prompt = f"""
    Analyze this skin lesion image alongside the AI classifier results and patient-reported context:
    - Primary Detected Condition: {diagnosis} ({confidence}% confidence)
    - Top Differentials: {', '.join(top_differentials)}
    - Anatomical Location: {body_location}
    - Duration Noticeable: {duration}
    - Patient-Reported Physical Symptoms: {symptoms_str}
    - Optical Erythema Index (Redness Concentration): +{erythema_index}%
    - Estimated Skin Phototype: {fitzpatrick_type or 'Unverified'}

Factor the anatomical site ({body_location}), duration ({duration}), and reported symptoms ({symptoms_str}) directly into your severity assessment, symptoms list, and recommended next steps.
Remember: Pair every medical term with a simple English translation in parentheses so a normal person understands it immediately.

Remember: Pair every medical term with a simple English translation in parentheses so a normal person understands it immediately.

Return ONLY valid JSON with this exact structure:
{{
  "dermoscopic_report": {{
    "visual_summary": "2-3 clear sentences describing what is visible in the photo (colors, bumps, borders, surface texture), pairing medical terms with plain English.",
    "extent_affected": "1-2 sentences explaining how much of the skin area is affected (e.g., clustered in one spot vs. spread out, surface-level vs. deeper) in normal English.",
    "severity_level": "LOW | MODERATE | ELEVATED | HIGH",
    "other_findings": [
      "Secondary visible sign 1 using 'Medical term (simple English meaning)'",
      "Secondary visible sign 2 using 'Medical term (simple English meaning)'"
    ],
    "pattern": "Observed layout + simple visual meaning",
    "pigment": "Color distribution + simple description",
    "vascular": "Blood vessel / redness appearance + simple description",
    "margin": "Edge/border shape + simple description"
  }},
  "symptoms_and_signs": [
    "Visible sign or physical feel 1 — e.g., 'Erythematous papules (red, tender bumps on the skin)'",
    "Visible sign or physical feel 2 — e.g., 'Localized warmth or mild pruritus (itchiness around the affected area)'",
    "Visible sign or physical feel 3 — e.g., 'Post-inflammatory hyperpigmentation (flat dark or pink marks left behind after a spot heals)'",
    "Visible sign or physical feel 4 — e.g., 'Comedones (clogged pores, blackheads, or whiteheads)'"
  ],
  "recommended_treatments": [
    {{
      "method": "Primary Clinical Care or Treatment Name",
      "modality": "CLINICAL | TOPICAL | PROCEDURAL | DAILY CARE",
      "details": "1-2 simple sentences explaining what this treatment is and how it helps clear or protect the skin."
    }},
    {{
      "method": "Supportive Daily Skincare Method",
      "modality": "DAILY CARE | TOPICAL",
      "details": "1-2 practical, easy-to-follow sentences on daily care (such as gentle cleansing, moisturizing, or sun protection)."
    }}
  ],
  "recommended_interventions": [
    {{
      "name": "Clear, actionable next step 1 (e.g., 'Book a routine dermatologist skin check')",
      "code": "CLINICAL",
      "urgency": "IMMEDIATE | SHORT_TERM | ROUTINE"
    }},
    {{
      "name": "Clear, actionable next step 2 (e.g., 'Track changes with a follow-up photo in 4 weeks')",
      "code": "MONITOR",
      "urgency": "SHORT_TERM | ROUTINE"
    }},
    {{
      "name": "Clear, actionable next step 3 (e.g., 'Apply daily broad-spectrum SPF 50+ sunscreen')",
      "code": "CARE",
      "urgency": "ROUTINE"
    }}
  ],
  "histological_context": {{
    "description": "2-3 sentences explaining what is actually happening beneath the skin for {diagnosis}, keeping the main medical terms but explaining them in friendly, everyday English.",
    "icd10": "Accurate ICD-10 code and standard medical name",
    "excision": "Standard clinical care or monitoring advice in plain English"
  }}
}}
"""

    try:
        logger.info(f"🧠 Requesting hybrid clinical/plain-English Groq VLM report for: {diagnosis}")
        completion = await client.chat.completions.create(
            model=GROQ_VLM_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": image_url}},
                    ],
                },
            ],
            reasoning_effort="none",
            temperature=0.25,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )

        report_json = json.loads(completion.choices[0].message.content)
        logger.info("✅ Groq VLM clinical report generated")
        return report_json

    except Exception as e:
        logger.error(f"❌ Groq VLM API call failed: {e}", exc_info=True)
        raise RuntimeError(f"Groq VLM synthesis failed: {str(e)}") from e