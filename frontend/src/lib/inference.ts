import * as ort from "onnxruntime-web";
import { GRADCAM_API_URL } from "./config";


// Configure WASM runtime for optimal performance
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
// ort.env.wasm.numThreads = 4;
ort.env.wasm.numThreads = self.crossOriginIsolated ? 4 : 1;
ort.env.wasm.simd = true;

let session: ort.InferenceSession | null = null;
let sessionPromise: Promise<ort.InferenceSession> | null = null;

export async function createInferenceSession(modelUrl: string): Promise<ort.InferenceSession> {
  return await ort.InferenceSession.create(modelUrl, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
  });
}

export async function initModel() {
  if (typeof window === "undefined") return null;
  if (session) return session;

  try {
    if (!sessionPromise) {
      sessionPromise = (async () => {
        console.log("📡 Loading ONNX model...");
        let lastError: unknown;

        for (const provider of ["webgl", "wasm"]) {
          try {
            console.log(`🔄 Initializing with ${provider}...`);
            const loadedSession = await ort.InferenceSession.create("/models/model.onnx", {
              executionProviders: [provider],
              graphOptimizationLevel: "all"
            });
            session = loadedSession;
            console.log(`✅ ONNX session ready (${provider})`);
            return loadedSession;
          } catch (e) {
            lastError = e;
            console.warn(`⚠️ ${provider} failed:`, e);
          }
        }

        throw new Error("All ONNX execution providers failed", { cause: lastError });
      })();
    }

    return await sessionPromise;
  } catch (e) {
    sessionPromise = null;
    console.error("❌ Model initialization failed:", e);
    return null;
  }
}

export async function runSkinInference(source: HTMLVideoElement | HTMLCanvasElement) {
  const sess = await initModel();
  if (!sess) {
    console.error("❌ No session available");
    return null;
  }

  try {
    // Extract frame from video
    const canvas = source instanceof HTMLCanvasElement ? source : document.createElement("canvas");
    if (canvas.width !== 224) canvas.width = 224;
    if (canvas.height !== 224) canvas.height = 224;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    if (source instanceof HTMLVideoElement) {
      ctx.drawImage(source, 0, 0, 224, 224);
    }
    const imageData = ctx.getImageData(0, 0, 224, 224).data;

    // Normalize using ImageNet statistics
    const red = new Float32Array(224 * 224);
    const green = new Float32Array(224 * 224);
    const blue = new Float32Array(224 * 224);

    for (let i = 0, j = 0; i < imageData.length; i += 4, j++) {
      red[j] = (imageData[i] / 255 - 0.485) / 0.229;
      green[j] = (imageData[i + 1] / 255 - 0.456) / 0.224;
      blue[j] = (imageData[i + 2] / 255 - 0.406) / 0.225;
    }

    // Transpose to CHW format
    const input = new Float32Array(3 * 224 * 224);
    input.set(red, 0);
    input.set(green, 224 * 224);
    input.set(blue, 2 * 224 * 224);

    const inputTensor = new ort.Tensor("float32", input, [1, 3, 224, 224]);

    // Run inference
    console.log("🔮 Running inference...");
    const inputName = sess.inputNames[0];
    const outputs = await sess.run({
      [inputName]: inputTensor
    });

    console.log("✅ Inference complete");
    console.log("📊 Output names:", Object.keys(outputs));

    return outputs;
  } catch (e) {
    console.error("❌ Inference error:", e);
    return null;
  }
}

/**
 * Generate real Grad-CAM heatmap by calling the FastAPI backend
 * Uses proper gradient-based class activation mapping (NOT fake Gaussian)
 * Based on SD1_py.py implementation
 */
export async function generateGradCAM(
  source: HTMLVideoElement | HTMLCanvasElement,
  classIdx?: number
): Promise<string> {
  if (!GRADCAM_API_URL) {
    console.warn("Grad-CAM API is not configured; skipping visualization.");
    return "";
  }

  try {
    console.log("🎯 Requesting Grad-CAM from FastAPI backend...");

    // Use the captured canvas directly or capture a frame from a video.
    const canvas = source instanceof HTMLCanvasElement ? source : document.createElement("canvas");
    if (canvas.width !== 224) canvas.width = 224;
    if (canvas.height !== 224) canvas.height = 224;
    const ctx = canvas.getContext("2d");

    if (!ctx) throw new Error("Failed to get canvas context");
    if (source instanceof HTMLVideoElement) {
      ctx.drawImage(source, 0, 0, 224, 224);
    }

    // Convert to base64 for transmission
    const imageBase64 = canvas.toDataURL("image/png").split(",")[1];

    // Grad-CAM is computed by the configured FastAPI service.
    const response = await fetch(`${GRADCAM_API_URL}/gradcam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imageBase64,
        classIdx: classIdx
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Grad-CAM received for class: ${data.className}`);

    // Convert base64 to data URL for display
    return `data:image/png;base64,${data.gradcam}`;

  } catch (e) {
    console.error("❌ Grad-CAM generation failed:", e);
    return "";
  }
}