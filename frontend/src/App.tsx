"use client";

import { useState, useEffect, useRef } from "react";
import CameraView from "./components/CameraView";
import DiagnosticCard from "./components/DiagnosticCard";
import TopPredictions from "./components/TopPredictions";
import GradCAMPanel from "./components/GradCAMPanel";
import StatusSidebar from "./components/StatusSidebar";
import { initModel, runSkinInference, generateGradCAM } from "./lib/inference";
import { CLASS_NAMES } from "./lib/constants";
import { BACKEND_URL } from "./lib/config";

export default function Home() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [modelStatus, setModelStatus] = useState("Initializing...");
  const [gradCamImage, setGradCamImage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    initModel().then((sess) => {
      if (sess) setModelStatus("Neural Engine Ready");
      else setModelStatus("Engine Error");
    });
  }, []);

  const handleDiagnose = async () => {
    if (!videoRef.current || modelStatus !== "Neural Engine Ready") {
      console.warn("⚠️ System not ready for diagnosis");
      return;
    }

    if (videoRef.current.readyState < 2) {
      console.warn("⚠️ Video stream not ready");
      return;
    }

    setIsScanning(true);

    try {
      const outputs = await runSkinInference(videoRef.current);

      if (!outputs || Object.keys(outputs).length === 0) {
        throw new Error("Model returned no outputs");
      }

      // Get first two outputs (disease and skin type)
      const outputKeys = Object.keys(outputs);
      const [firstOutput, secondOutput] = outputKeys.map((key) => outputs[key]);

      if (!firstOutput?.data || !secondOutput?.data) {
        console.error("Invalid output structure:", { firstOutput, secondOutput });
        throw new Error("Model outputs don't have 'data' property");
      }

      // Convert tensors to arrays
      const diseaseProbs = Array.from(firstOutput.data as Float32Array);
      const skinProbs = Array.from(secondOutput.data as Float32Array);

      // Apply softmax for proper probabilities
      const softmaxDisease = softmax(diseaseProbs);
      const maxProb = Math.max(...softmaxDisease);
      const dIdx = softmaxDisease.indexOf(maxProb);
      const sIdx = skinProbs.indexOf(Math.max(...skinProbs));

        if (maxProb < 0.20) {
          setResult({
            disease: "Inconclusive Dermal Pattern",
            confidence: Math.round(maxProb * 1000) / 10,
            skin_type: "--",
            risk: "Low",
            probabilities: softmaxDisease,
            // Add a custom instruction for the UI to display
            instruction: "Pattern mismatch. Ensure the lesion is centered and check focal depth.",
            isLowConfidence: true 
          });
          
          // Skip Grad-CAM if the model doesn't even know what it's looking at
          setGradCamImage(null); 
          setIsScanning(false);
          return;
          }

      setResult({
        disease: CLASS_NAMES[dIdx] || `Unknown ID: ${dIdx}`,
        confidence: Math.round(maxProb * 1000) / 10,
        skin_type: `Type ${sIdx + 1}`,
        risk: classifyRisk(dIdx),
        raw_skin_idx: sIdx,
        probabilities: softmaxDisease,
        topPredictions: getTopK(softmaxDisease, CLASS_NAMES, 5)
      });

      // Generate Grad-CAM visualization (pass the disease class index, not confidence)
      console.log("🎨 Generating Grad-CAM...");
      const gradcamImage = await generateGradCAM(videoRef.current, dIdx);
      setGradCamImage(gradcamImage);

      
      console.log("✅ Diagnosis Complete:", {
        disease: CLASS_NAMES[dIdx],
        confidence: Math.round(maxProb * 1000) / 10,
        skinType: `Type ${sIdx + 1}`
      });
    } catch (err) {
      console.error("❌ Diagnosis Failed:", err);
      alert(`Diagnosis error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden flex flex-col items-center p-4 md:p-8">
      {/* HUD Background Grid */}
      <div className="fixed inset-0 bg-size-[40px_40px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] pointer-events-none" />

      {/* Main Professional HUD Grid */}
      <div className="relative z-10 w-full max-w-375 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: Top Predictions & Metrics */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-2 lg:order-1">
          <TopPredictions topPredictions={result?.topPredictions} />
          
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-4">
            <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Neural Engine</span>
                <span className={`text-sm font-mono ${modelStatus.includes("Ready") ? "text-green-400" : "text-amber-400"}`}>
                  {modelStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Risk Level</span>
                <span className={`text-sm font-mono ${result?.risk === "High" ? "text-red-400" : result?.risk === "Moderate" ? "text-amber-400" : "text-green-400"}`}>
                  {result?.risk || "--"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400 text-sm">Skin Type</span>
                <span className="text-sm font-mono text-cyan-400">{result?.skin_type || "--"}</span>
              </div>
              {result?.confidence && (
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Confidence</span>
                  <span className="text-sm font-mono text-cyan-400">{result.confidence}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER: Camera & Grad-CAM */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-1 lg:order-2">
          {/* Camera */}
          <div className="w-full">
            <CameraView ref={videoRef} onCapture={handleDiagnose} isScanning={isScanning} />
          </div>
          
          {/* Grad-CAM */}
          <GradCAMPanel gradCamImage={gradCamImage} isScanning={isScanning} />
        </div>

        {/* RIGHT: Diagnostic Report */}
        <div className="lg:col-span-4 flex flex-col gap-6 order-3">
          <DiagnosticCard result={result} isScanning={isScanning} />
          <div className="hidden lg:block h-px bg-zinc-800" />
          <StatusSidebar modelStatus={modelStatus} isScanning={isScanning} />
        </div>

      </div>
    </main>
  );
}

// ============= UTILITY FUNCTIONS =============

/** Apply softmax to convert logits to probabilities */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map((x) => Math.exp(x - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map((x) => x / sumExps);
}

/** Classify disease risk based on disease index */
function classifyRisk(diseaseIdx: number): "Low" | "Moderate" | "High" {
  // High-risk diseases: melanoma, carcinomas, etc.
  const highRiskIndices = [8, 9, 22, 56, 99];
  if (highRiskIndices.includes(diseaseIdx)) return "High";
  if (diseaseIdx > 50) return "Moderate";
  return "Low";
}

/** Get top K predictions */
function getTopK(
  probs: number[],
  classNames: string[],
  k: number = 5
): Array<{ name: string; probability: number; index: number }> {
  return probs
    .map((prob, idx) => ({ name: classNames[idx], probability: prob, index: idx }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, k);
}