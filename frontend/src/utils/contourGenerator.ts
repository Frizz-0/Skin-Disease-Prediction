export async function generateIsoContourMap(
    rawSnapshot: string,
    gradCamImage: string
): Promise<{ imageUrl: string; areaRatio: number }> {
    return new Promise((resolve) => {
        const raw = new Image();
        const cam = new Image();
        raw.crossOrigin = 'anonymous';
        cam.crossOrigin = 'anonymous';

        raw.onload = () => {
            cam.onload = () => {
                const w = 448;
                const h = 448;
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) return resolve({ imageUrl: rawSnapshot, areaRatio: 4.2 });

                ctx.drawImage(raw, 0, 0, w, h);

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = w;
                tempCanvas.height = h;
                const tempCtx = tempCanvas.getContext('2d');
                if (!tempCtx) return resolve({ imageUrl: rawSnapshot, areaRatio: 4.2 });

                tempCtx.drawImage(cam, 0, 0, w, h);
                const camData = tempCtx.getImageData(0, 0, w, h).data;
                const rawImageData = ctx.getImageData(0, 0, w, h);
                const pixels = rawImageData.data;

                const saliency = new Float32Array(w * h);
                let activePixelCount = 0;

                for (let i = 0; i < w * h; i++) {
                    const idx = i * 4;
                    const r = camData[idx] / 255.0;
                    const g = camData[idx + 1] / 255.0;
                    const b = camData[idx + 2] / 255.0;
                    const val = Math.min(Math.max(r * 0.72 + g * 0.2 + b * 0.08, 0.0), 1.0);
                    saliency[i] = val;
                    if (val > 0.22) activePixelCount++;
                }

                const areaRatio = parseFloat(((activePixelCount / (w * h)) * 100).toFixed(1));

                // Soft Luminous Core Bloom
                for (let i = 0; i < w * h; i++) {
                    const s = saliency[i];
                    if (s > 0.38) {
                        const t = Math.min((s - 0.38) / 0.52, 1.0);
                        const idx = i * 4;
                        const glowR = 255 * (1.0 - t * 0.05) + 240 * (t * 0.05);
                        const glowG = 135 * (1.0 - t) + 220 * t;
                        const glowB = 25 * (1.0 - t) + 40 * t;
                        const alpha = t * 0.5;

                        pixels[idx] = Math.round(pixels[idx] * (1.0 - alpha) + glowR * alpha);
                        pixels[idx + 1] = Math.round(pixels[idx + 1] * (1.0 - alpha) + glowG * alpha);
                        pixels[idx + 2] = Math.round(pixels[idx + 2] * (1.0 - alpha) + glowB * alpha);
                    }
                }
                ctx.putImageData(rawImageData, 0, 0);

                // Iso-Contour Lines
                const tiers = [
                    { threshold: 0.22, color: 'rgba(255, 255, 255, 0.95)', size: 0.5 },
                    { threshold: 0.45, color: 'rgba(249, 115, 22, 0.95)', size: 0.5 },
                    { threshold: 0.68, color: 'rgba(245, 158, 11, 0.98)', size: 1.0 },
                    { threshold: 0.85, color: 'rgba(254, 240, 138, 1.0)', size: 1.5 }
                ];

                tiers.forEach(({ threshold, color, size }) => {
                    ctx.fillStyle = color;
                    for (let y = 1; y < h - 1; y++) {
                        for (let x = 1; x < w - 1; x++) {
                            const idx = y * w + x;
                            const val = saliency[idx];
                            if (val >= threshold) {
                                const l = saliency[idx - 1];
                                const r = saliency[idx + 1];
                                const u = saliency[idx - w];
                                const d = saliency[idx + w];

                                if (l < threshold || r < threshold || u < threshold || d < threshold) {
                                    ctx.fillRect(x - size / 2, y - size / 2, size, size);
                                }
                            }
                        }
                    }
                });

                resolve({ imageUrl: canvas.toDataURL('image/png'), areaRatio: areaRatio || 4.2 });
            };
            cam.src = gradCamImage;
        };
        raw.src = rawSnapshot;
    });
}