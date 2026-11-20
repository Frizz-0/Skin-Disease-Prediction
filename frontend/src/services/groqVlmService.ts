import type { VlmClinicalReport, PatientContext } from '../types/clinical';

export interface ClinicalReportPayload {
    imageBase64: string;
    diagnosis: string;
    confidence: number;
    topDifferentials: string[];
    erythemaIndex: number;
    fitzpatrickType: number | null;
    patientContext: PatientContext;
}

const rawApiBase =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_BACKEND_URL ||
    '';

// Strip trailing slashes to prevent FastAPI 404s on `//clinical-report`
const API_BASE_URL = rawApiBase.replace(/\/+$/, '');

export async function fetchVlmClinicalReport(
    payload: ClinicalReportPayload
): Promise<VlmClinicalReport> {
    const safeConfidence = Number.isFinite(payload.confidence) ? Math.round(payload.confidence) : 0;
    const safeErythema = Number.isFinite(payload.erythemaIndex) ? payload.erythemaIndex : 0.0;

    const response = await fetch(`${API_BASE_URL}/clinical-report`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: payload.imageBase64,
            diagnosis: payload.diagnosis || 'Unknown Lesion',
            confidence: safeConfidence,
            top_differentials: payload.topDifferentials || [],
            erythema_index: safeErythema,
            fitzpatrick_type: typeof payload.fitzpatrickType === 'number' ? payload.fitzpatrickType : null,
            body_location: payload.patientContext?.bodyLocation || 'Not specified',
            duration: payload.patientContext?.duration || 'Not specified',
            patient_symptoms: payload.patientContext?.symptoms || [],
            age: payload.patientContext?.age?.trim() || 'Not specified',
            gender: payload.patientContext?.gender || 'Not specified',
            clinical_notes: payload.patientContext?.clinicalNotes?.trim() || 'Not specified',
        }),
    });

    if (!response.ok) {
        let errorDetail = `Server responded with status ${response.status}`;
        try {
            const errJson = await response.json();
            if (typeof errJson?.detail === 'string') {
                errorDetail = errJson.detail;
            } else if (Array.isArray(errJson?.detail)) {
                errorDetail = errJson.detail
                    .map((e: { loc?: string[]; msg?: string }) => `${e.loc?.slice(1).join('.') || 'field'}: ${e.msg}`)
                    .join(' | ');
            }
        } catch {
            // Fallback to HTTP status message
        }
        throw new Error(errorDetail);
    }

    return (await response.json()) as VlmClinicalReport;
}   