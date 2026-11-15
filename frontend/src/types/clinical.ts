export const FITZPATRICK_LABELS = ['I', 'II', 'III', 'IV', 'V', 'VI'];

export const BODY_LOCATIONS = ['Face / Neck', 'Arm / Hand', 'Torso', 'Back', 'Leg / Foot'];
export const LESION_DURATIONS = ['< 1 week', '1–4 weeks', '1–6 months', '6+ months'];
export const PATIENT_SYMPTOM_OPTIONS = [
    'Itchy',
    'Painful / Tender',
    'Bleeding / Oozing',
    'Growing / Changing'
];

export interface PatientContext {
    bodyLocation: string;
    duration: string;
    symptoms: string[];
}

export interface TreatmentMethod {
    method: string;
    modality: string;
    details: string;
}

export interface ClinicalIntervention {
    name: string;
    code: string;
    urgency: 'IMMEDIATE' | 'SHORT_TERM' | 'ROUTINE';
}

export interface VlmClinicalReport {
    dermoscopic_report: {
        visual_summary: string;
        extent_affected: string;
        severity_level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
        severity_rationale: string;
        other_findings: string[];
        pattern: string;
        pigment: string;
        vascular: string;
        margin: string;
    };
    symptoms_and_signs: string[];
    recommended_treatments: TreatmentMethod[];
    recommended_interventions: ClinicalIntervention[];
    histological_context: {
        description: string;
        icd10: string;
        excision: string;
    };
}