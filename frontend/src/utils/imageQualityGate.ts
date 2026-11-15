export type QualityStatus = 'READY' | 'WARN' | 'BLOCK';

export interface QualityTelemetry {
    status: QualityStatus;
    headline: string;
    sharpnessScore: number; // 0 - 100
    meanLuminance: number;  // 0 - 255
    glarePercent: number;   // 0 - 100
    exposureLabel: 'LOW LIGHT' | 'BALANCED' | 'GLARE';
}

const GATE_SIZE = 96;
let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;

function getGateContext(): CanvasRenderingContext2D | null {
    if (!cachedCanvas) {
        cachedCanvas = document.createElement('canvas');
        cachedCanvas.width = GATE_SIZE;
        cachedCanvas.height = GATE_SIZE;
        cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });
    }
    return cachedCtx;
}

export function evaluateFrameQuality(source: HTMLVideoElement | HTMLCanvasElement): QualityTelemetry {
    const SIZE = GATE_SIZE;
    const ctx = getGateContext();
    if (!ctx) {
        return {
            status: 'READY',
            headline: 'Camera Ready',
            sharpnessScore: 80,
            meanLuminance: 128,
            glarePercent: 0,
            exposureLabel: 'BALANCED',
        };
    }

    const srcW = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
    const srcH = source instanceof HTMLVideoElement ? source.videoHeight : source.height;

    if (!srcW || !srcH) {
        return {
            status: 'BLOCK',
            headline: 'Initializing Camera Feed...',
            sharpnessScore: 0,
            meanLuminance: 0,
            glarePercent: 0,
            exposureLabel: 'LOW LIGHT',
        };
    }

    const minSide = Math.min(srcW, srcH);
    const sx = (srcW - minSide) / 2;
    const sy = (srcH - minSide) / 2;

    ctx.drawImage(source, sx, sy, minSide, minSide, 0, 0, SIZE, SIZE);
    const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

    const totalPixels = SIZE * SIZE;
    const gray = new Float32Array(totalPixels);

    let lumaSum = 0;
    let glarePixels = 0;

    for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const luma = 0.299 * r + 0.587 * g + 0.114 * b;
        gray[i] = luma;
        lumaSum += luma;

        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        if (luma > 240 && maxChannel - minChannel < 26) {
            glarePixels++;
        }
    }

    const meanLuminance = lumaSum / totalPixels;
    const glareRatio = glarePixels / totalPixels;
    const glarePercent = Math.round(glareRatio * 100);

    let lumaSqDiff = 0;
    for (let i = 0; i < totalPixels; i++) {
        const d = gray[i] - meanLuminance;
        lumaSqDiff += d * d;
    }
    const lumaStdDev = Math.sqrt(lumaSqDiff / totalPixels);

    let lapSum = 0;
    let lapSqSum = 0;
    let lapCount = 0;

    for (let y = 1; y < SIZE - 1; y++) {
        const rowOffset = y * SIZE;
        for (let x = 1; x < SIZE - 1; x++) {
            const c = rowOffset + x;
            const lap =
                gray[c - SIZE] +
                gray[c - 1] -
                4 * gray[c] +
                gray[c + 1] +
                gray[c + SIZE];

            lapSum += lap;
            lapSqSum += lap * lap;
            lapCount++;
        }
    }

    const lapMean = lapSum / lapCount;
    const laplacianVariance = lapSqSum / lapCount - lapMean * lapMean;
    const sharpnessScore = Math.min(100, Math.max(0, Math.round((laplacianVariance / 65) * 100)));

    if (meanLuminance < 48 || lumaStdDev < 7.5) {
        return {
            status: 'BLOCK',
            headline: meanLuminance < 48 ? 'Too Dark — Move to Brighter Light' : 'Center Skin Lesion Inside Reticle',
            sharpnessScore,
            meanLuminance: Math.round(meanLuminance),
            glarePercent,
            exposureLabel: 'LOW LIGHT',
        };
    }

    if (laplacianVariance < 16) {
        return {
            status: 'BLOCK',
            headline: 'Motion Blur — Hold Camera Steady',
            sharpnessScore,
            meanLuminance: Math.round(meanLuminance),
            glarePercent,
            exposureLabel: glareRatio > 0.12 ? 'GLARE' : 'BALANCED',
        };
    }

    if (glareRatio > 0.12 || meanLuminance > 235) {
        return {
            status: 'WARN',
            headline: 'Surface Glare — Tilt Angle Slightly',
            sharpnessScore,
            meanLuminance: Math.round(meanLuminance),
            glarePercent,
            exposureLabel: 'GLARE',
        };
    }

    if (laplacianVariance < 32) {
        return {
            status: 'WARN',
            headline: 'Soft Focus — Adjust Distance Slightly',
            sharpnessScore,
            meanLuminance: Math.round(meanLuminance),
            glarePercent,
            exposureLabel: 'BALANCED',
        };
    }

    return {
        status: 'READY',
        headline: 'Sharp Focus • Balanced Light • Ready',
        sharpnessScore,
        meanLuminance: Math.round(meanLuminance),
        glarePercent,
        exposureLabel: 'BALANCED',
    };
}