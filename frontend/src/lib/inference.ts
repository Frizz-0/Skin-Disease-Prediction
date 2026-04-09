import * as ort from "onnxruntime-web";
import { BACKEND_URL } from "./config";


// Configure WASM runtime for optimal performance
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";
ort.env.wasm.numThreads = 4;
ort.env.wasm.simd = true;

let session: ort.InferenceSession | null = null;

export async function initModel() {
  if (typeof window === "undefined") return null;

  try {
    if (!session) {
      console.log("📡 Loading ONNX model...");

      // Verify model file exists
      const headResponse = await fetch("/models/model.onnx", { method: "HEAD" });
      if (!headResponse.ok) {
        throw new Error(
          `Model file not found (HTTP ${headResponse.status}). Ensure public/models/model.onnx exists.`
        );
      }
      console.log("✅ Model file verified");

      // Try different execution providers for best performance
      const providers: string[] = ["webgl", "wasm"];

      for (const provider of providers) {
        try {
          console.log(`🔄 Initializing with ${provider}...`);
          session = await ort.InferenceSession.create("/models/model.onnx", {
            executionProviders: [provider],
            graphOptimizationLevel: "all"
          });
          console.log(`✅ ONNX session ready (${provider})`);
          return session;
        } catch (e) {
          console.warn(`⚠️ ${provider} failed:`, e);
        }
      }

      throw new Error("All execution providers failed");
    }
    return session;
  } catch (e) {
    console.error("❌ Model initialization failed:", e);
    return null;
  }
}

export async function runSkinInference(video: HTMLVideoElement) {
  const sess = await initModel();
  if (!sess) {
    console.error("❌ No session available");
    return null;
  }

  try {
    // Extract frame from video
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(video, 0, 0, 224, 224);
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
  video: HTMLVideoElement,
  classIdx?: number
): Promise<string> {
  try {
    console.log("🎯 Requesting Grad-CAM from FastAPI backend...");

    // Capture frame from video
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) throw new Error("Failed to get canvas context");
    ctx.drawImage(video, 0, 0, 224, 224);

    // Convert to base64 for transmission
    const imageBase64 = canvas.toDataURL("image/png").split(",")[1];

    // Call FastAPI Grad-CAM endpoint (port 8000)
    // ... later in generateGradCAM function ...
    const response = await fetch(`${BACKEND_URL}/gradcam`, {
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
    // Fallback to simple visualization if backend unavailable
    return generateFallbackGradCAM(video);
  }
}

/**
 * Fallback visualization if backend is unavailable
 * (Shows simple heatmap - lower quality than real Grad-CAM)
 */
function generateFallbackGradCAM(video: HTMLVideoElement): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(video, 0, 0, 224, 224);
    const imgData = ctx.getImageData(0, 0, 224, 224);

    // Create a simple center-weighted heatmap
    const heatmap = createCenterWeightedHeatmap(224, 224);
    const blended = blendImages(imgData, heatmap, 0.4);

    ctx.putImageData(blended, 0, 0);
    ctx.fillStyle = "rgba(255, 100, 100, 0.7)";
    ctx.font = "14px monospace";
    ctx.fillText("⚠️ Backend unavailable", 50, 220);

    return canvas.toDataURL("image/png");
  } catch (e) {
    console.error("❌ Fallback Grad-CAM failed:", e);
    return "";
  }
}

/**
 * Create a simple center-weighted heatmap (emergency fallback only)
 */
function createCenterWeightedHeatmap(
  width: number,
  height: number
): Uint8ClampedArray {
  const heatmap = new Uint8ClampedArray(width * height * 4);
  const centerX = width / 2;
  const centerY = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const distSq = dx * dx + dy * dy;
      const intensity = Math.exp(-distSq / (2 * 60 * 60));

      heatmap[idx] = Math.floor(255 * intensity);      // R
      heatmap[idx + 1] = Math.floor(100 * intensity);  // G
      heatmap[idx + 2] = Math.floor(100 * intensity);  // B
      heatmap[idx + 3] = Math.floor(intensity * 100);  // A
    }
  }

  return heatmap;
}

/**
 * Blend image with heatmap
 */
function blendImages(
  imgData: ImageData,
  heatmap: Uint8ClampedArray,
  alpha: number
): ImageData {
  const result = new ImageData(imgData.width, imgData.height);
  const data = result.data;
  const orig = imgData.data;

  for (let i = 0; i < orig.length; i += 4) {
    const heat = heatmap[i + 3] / 255;
    data[i] = orig[i] * (1 - alpha * heat) + heatmap[i] * alpha * heat;
    data[i + 1] = orig[i + 1] * (1 - alpha * heat) + heatmap[i + 1] * alpha * heat;
    data[i + 2] = orig[i + 2] * (1 - alpha * heat) + heatmap[i + 2] * alpha * heat;
    data[i + 3] = 255;
  }

  return result;
}