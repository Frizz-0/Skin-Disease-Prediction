import type { ClinicalIntervention, PatientContext } from '../types/clinical';

export interface CvAbcMetrics {
    asymmetryPct: number;
    isAsymmetric: boolean;
    borderIrregular: boolean;
    borderLabel: string;
    colorTones: number;
    isVariegated: boolean;
}

export interface AbcdeChecklistItem {
    id: 'A' | 'B' | 'C' | 'D' | 'E';
    letter: string;
    label: string;
    hint: string;
    value: string;
    checked: boolean;
}

/**
 * Extracts quantitative Asymmetry, Border irregularity, and Color variance
 * directly from the 224x224 RGB lesion capture.
 */
export function analyzeLesionAbc(canvas: HTMLCanvasElement): CvAbcMetrics {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return {
            asymmetryPct: 12,
            isAsymmetric: false,
            borderIrregular: false,
            borderLabel: 'SMOOTH',
            colorTones: 2,
            isVariegated: false,
        };
    }

    const { width, height } = canvas;
    const { data } = ctx.getImageData(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const coreRadius = width * 0.24;

    // 1. Bilateral & Vertical Luminance Asymmetry inside central lesion ROI
    let leftSum = 0, leftCount = 0;
    let rightSum = 0, rightCount = 0;
    let topSum = 0, topCount = 0;
    let bottomSum = 0, bottomCount = 0;

    // 2. Color quantization buckets (4x4x4 = 64 chromatic bins)
    const colorBins = new Uint16Array(64);
    let totalCorePixels = 0;

    for (let y = Math.floor(cy - coreRadius); y < Math.ceil(cy + coreRadius); y += 2) {
        for (let x = Math.floor(cx - coreRadius); x < Math.ceil(cx + coreRadius); x += 2) {
            const dx = x - cx;
            const dy = y - cy;
            if (dx * dx + dy * dy > coreRadius * coreRadius) continue;

            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const luma = 0.299 * r + 0.587 * g + 0.114 * b;

            if (dx < 0) { leftSum += luma; leftCount++; }
            else { rightSum += luma; rightCount++; }

            if (dy < 0) { topSum += luma; topCount++; }
            else { bottomSum += luma; bottomCount++; }

            const bin = ((r >> 6) << 4) | ((g >> 6) << 2) | (b >> 6);
            colorBins[bin]++;
            totalCorePixels++;
        }
    }

    const lrDiff = Math.abs((leftSum / Math.max(leftCount, 1)) - (rightSum / Math.max(rightCount, 1)));
    const tbDiff = Math.abs((topSum / Math.max(topCount, 1)) - (bottomSum / Math.max(bottomCount, 1)));
    const asymmetryPct = Math.min(95, Math.max(4, Math.round(((lrDiff + tbDiff) / 255) * 260)));

    // Count distinct pigment clusters representing at least 3% of lesion area
    const minClusterThreshold = Math.max(4, totalCorePixels * 0.03);
    let colorTones = 0;
    for (let i = 0; i < 64; i++) {
        if (colorBins[i] >= minClusterThreshold) colorTones++;
    }

    // 3. Border Transition Roughness along the peripheral ring (r = 0.22W to 0.32W)
    const ringRadii = [width * 0.22, width * 0.28];
    const samples = 36;
    const ringLumas: number[] = [];

    for (const r of ringRadii) {
        for (let s = 0; s < samples; s++) {
            const theta = (s / samples) * Math.PI * 2;
            const px = Math.min(width - 1, Math.max(0, Math.round(cx + r * Math.cos(theta))));
            const py = Math.min(height - 1, Math.max(0, Math.round(cy + r * Math.sin(theta))));
            const idx = (py * width + px) * 4;
            ringLumas.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
        }
    }

    let ringDiffSum = 0;
    for (let i = 1; i < ringLumas.length; i++) {
        ringDiffSum += Math.abs(ringLumas[i] - ringLumas[i - 1]);
    }
    const avgAngularStep = ringDiffSum / Math.max(ringLumas.length - 1, 1);
    const borderIrregular = avgAngularStep > 14.5;

    return {
        asymmetryPct,
        isAsymmetric: asymmetryPct >= 18,
        borderIrregular,
        borderLabel: borderIrregular ? 'NOTCHED' : 'REGULAR',
        colorTones: Math.max(1, colorTones),
        isVariegated: colorTones >= 4,
    };
}

/**
 * Generates immediate clinical triage actions from ONNX output, ABCDE flags,
 * and reported symptoms before the VLM report is triggered.
 */
export function buildInstantInterventions(params: {
    hasScan: boolean;
    isHighRisk: boolean;
    flaggedCount: number;
    patientContext: PatientContext;
}): ClinicalIntervention[] {
    const { hasScan, isHighRisk, flaggedCount, patientContext } = params;
    if (!hasScan) return [];

    const hasBleedingOrGrowth =
        patientContext.symptoms.includes('Bleeding / Ooze') ||
        patientContext.symptoms.includes('Changing Size');

    const items: ClinicalIntervention[] = [];

    if (isHighRisk || hasBleedingOrGrowth || flaggedCount >= 3) {
        items.push({
            name: 'In-Person Dermoscopy Evaluation',
            code: 'DERM-99203',
            urgency: 'IMMEDIATE',
        });
    } else {
        items.push({
            name: 'GP / Teledermatology Review',
            code: 'TRIAGE-101',
            urgency: 'SHORT_TERM',
        });
    }

    items.push({
        name: `Ruler Scale Photo (${patientContext.bodyLocation})`,
        code: 'PHOTO-DOC',
        urgency: 'SHORT_TERM',
    });

    if (patientContext.symptoms.includes('Itchy') || patientContext.symptoms.includes('Tender / Pain')) {
        items.push({
            name: 'Avoid Friction & Fragrance Irritants',
            code: 'SKIN-CARE',
            urgency: 'ROUTINE',
        });
    } else {
        items.push({
            name: 'Broad-Spectrum SPF 50+ Protection',
            code: 'UV-GUARD',
            urgency: 'ROUTINE',
        });
    }

    return items;
}