import { useState, useRef, useMemo, useEffect, type ChangeEvent } from 'react';
import type { CameraViewHandle, SpectralMode } from './components/CameraView';
import { useInference } from './hooks/useInference';
import type { VlmClinicalReport, PatientContext } from './types/clinical';
import { generateIsoContourMap } from './utils/contourGenerator';
import { fetchVlmClinicalReport } from './services/groqVlmService';

import Header from './components/Header';
import CameraSection from './components/CameraSection';
import PathologyReportCard from './components/PathologyReportCard';
import BiometricsPanel from './components/BiometricsPanel';
import ReportView from './components/ReportView';

export default function App() {
  const cameraRef = useRef<CameraViewHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeSpectrum, setActiveSpectrum] = useState<SpectralMode>('RGB');
  const [rawSnapshot, setRawSnapshot] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'Analyze' | 'History' | 'Report'>('Analyze');
  const [erythemaIndex, setErythemaIndex] = useState<number>(8.4);
  const [isoContourImage, setIsoContourImage] = useState<string | null>(null);
  const [calculatedAreaRatio, setCalculatedAreaRatio] = useState<number>(4.2);

  // Patient Symptom & Anatomical Context
  const [patientContext, setPatientContext] = useState<PatientContext>({
    bodyLocation: 'Face / Neck',
    duration: '1–4 weeks',
    symptoms: []
  });

  // On-Click Groq VLM Report State
  const [vlmReport, setVlmReport] = useState<VlmClinicalReport | null>(null);
  const [isVlmLoading, setIsVlmLoading] = useState<boolean>(false);
  const [vlmError, setVlmError] = useState<string | null>(null);

  const {
    runInference,
    gradCamImage,
    topPredictions,
    skinTypePrediction,
    isModelLoading,
    isModelReady,
    isInferring,
    modelError
  } = useInference();

  useEffect(() => {
    if (!rawSnapshot || !gradCamImage) return;
    generateIsoContourMap(rawSnapshot, gradCamImage).then(({ imageUrl, areaRatio }) => {
      setIsoContourImage(imageUrl);
      setCalculatedAreaRatio(areaRatio);
    });
  }, [rawSnapshot, gradCamImage]);

  const topPrediction = topPredictions && topPredictions.length > 0 ? topPredictions[0] : null;
  const confidenceScore = topPrediction ? Math.round(topPrediction.probability * 100) : 0;
  const isHighRisk = topPrediction
    ? topPrediction.className.toLowerCase().includes('melanoma') ||
    topPrediction.className.toLowerCase().includes('carcinoma')
    : false;

  // Triggered onClick of "Generate Clinical Report"
  const handleGenerateClinicalReport = async () => {
    if (!rawSnapshot || !topPrediction || isVlmLoading) return;

    setIsVlmLoading(true);
    setVlmError(null);

    try {
      const report = await fetchVlmClinicalReport({
        imageBase64: rawSnapshot,
        diagnosis: topPrediction.className,
        confidence: confidenceScore,
        topDifferentials: (topPredictions || [])
          .slice(0, 5)
          .map((p) => `${p.className} (${Math.round(p.probability * 100)}%)`),
        erythemaIndex,
        fitzpatrickType: skinTypePrediction,
        patientContext
      });
      setVlmReport(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate clinical report.';
      console.error('VLM Clinical Report Error:', err);
      setVlmError(message);
    } finally {
      setIsVlmLoading(false);
    }
  };

  const hasReportedEvolution =
    patientContext.symptoms.includes('Growing / Changing') ||
    patientContext.symptoms.includes('Bleeding / Oozing');

  const abcdData = useMemo(() => {
    if (!topPrediction) {
      return [
        { label: 'Asymmetry:', value: 'STANDBY', checked: false },
        { label: 'Border:', value: 'STANDBY', checked: false },
        { label: 'Color:', value: 'STANDBY', checked: false },
        { label: 'Diameter:', value: 'STANDBY', checked: false },
        { label: 'Evolution:', value: 'STANDBY', checked: false }
      ];
    }
    return [
      { label: 'Asymmetry:', value: isHighRisk && confidenceScore > 40 ? 'POSITIVE' : 'SYMMETRIC', checked: isHighRisk },
      { label: 'Border:', value: isHighRisk ? 'IRREGULAR' : 'CIRCUMSCRIBED', checked: isHighRisk },
      { label: 'Color:', value: isHighRisk ? 'VARIEGATED' : 'HOMOGENEOUS', checked: isHighRisk },
      { label: 'Diameter:', value: confidenceScore > 45 ? '>6.0mm' : 'SUB-6mm', checked: confidenceScore > 45 },
      {
        label: 'Evolution:',
        value: hasReportedEvolution ? 'REPORTED' : isHighRisk ? 'SUSPECT' : 'STABLE',
        checked: hasReportedEvolution || isHighRisk
      }
    ];
  }, [topPrediction, isHighRisk, confidenceScore, hasReportedEvolution]);

  const computeErythemaIndex = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const imgData = ctx.getImageData(0, 0, width, height).data;
    let coreErythema = 0, coreCount = 0;
    let periErythema = 0, periCount = 0;
    const cx = width / 2, cy = height / 2;
    const rCoreSq = Math.pow(width * 0.18, 2);
    const rPeriSq = Math.pow(width * 0.38, 2);

    for (let y = 0; y < height; y += 8) {
      for (let x = 0; x < width; x += 8) {
        const idx = (y * width + x) * 4;
        const r = imgData[idx], g = imgData[idx + 1];
        const er = (r - g) / Math.max(r + g, 10);
        const dSq = Math.pow(x - cx, 2) + Math.pow(y - cy, 2);
        if (dSq < rCoreSq) { coreErythema += er; coreCount++; }
        else if (dSq > rPeriSq) { periErythema += er; periCount++; }
      }
    }
    const cAvg = coreCount > 0 ? coreErythema / coreCount : 0;
    const pAvg = periCount > 0 ? periErythema / periCount : 0;
    const indexPct = Math.max(0.5, Math.min(45.0, (cAvg - pAvg) * 100 + 6.5));
    setErythemaIndex(parseFloat(indexPct.toFixed(1)));
  };

  const handleStartDiagnosis = async () => {
    if (!cameraRef.current) return;
    const canvas = cameraRef.current.captureCanvas();
    if (!canvas) return;

    setVlmReport(null);
    setVlmError(null);
    setRawSnapshot(canvas.toDataURL('image/jpeg', 0.94));
    computeErythemaIndex(canvas);

    try {
      await runInference(canvas);
    } catch (err) {
      console.error('Diagnosis Failed:', err);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = 224;
        offscreen.height = 224;
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 224, 224);
          setVlmReport(null);
          setVlmError(null);
          setRawSnapshot(offscreen.toDataURL('image/jpeg', 0.94));
          computeErythemaIndex(offscreen);
          runInference(offscreen);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handlePrintReport = () => {
    setActiveTab('Report');
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #D9CFD7 0%, #f4f0e8 50%, #eae4d8 100%)'
      }}
      className="min-h-screen text-slate-800 font-sans p-2.5 sm:p-4 lg:p-6 select-text flex flex-col gap-3.5 sm:gap-5 max-w-[1740px] mx-auto relative overflow-hidden transition-all duration-300"
    >
      <div className="fixed top-12 left-10 w-96 h-96 rounded-full bg-gradient-to-tr from-[#e4765d]/10 to-amber-200/20 blur-3xl pointer-events-none animate-pulse -z-10" />
      <div className="fixed bottom-12 right-10 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-[#c58d6e]/10 to-rose-200/20 blur-3xl pointer-events-none -z-10" />

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUploadClick={() => fileInputRef.current?.click()}
        onPrintClick={handlePrintReport}
      />

      {activeTab === 'Report' ? (
        <ReportView
          rawSnapshot={rawSnapshot}
          isoContourImage={isoContourImage}
          calculatedAreaRatio={calculatedAreaRatio}
          topPrediction={topPrediction}
          topPredictions={topPredictions}
          confidenceScore={confidenceScore}
          isHighRisk={isHighRisk}
          erythemaIndex={erythemaIndex}
          skinTypePrediction={skinTypePrediction}
          abcdData={abcdData}
          patientContext={patientContext}
          vlmReport={vlmReport}
          isVlmLoading={isVlmLoading}
          vlmError={vlmError}
          onGenerateReport={handleGenerateClinicalReport}
          onBackToAnalyze={() => setActiveTab('Analyze')}
        />
      ) : (
        <main className="grid grid-cols-12 gap-3.5 sm:gap-5 flex-1 relative z-10">
          <CameraSection
            cameraRef={cameraRef}
            activeSpectrum={activeSpectrum}
            onSpectrumChange={setActiveSpectrum}
            onStartDiagnosis={handleStartDiagnosis}
            isInferring={isInferring}
            isModelReady={isModelReady}
            isModelLoading={isModelLoading}
            modelError={modelError}
            topPrediction={topPrediction}
            confidenceScore={confidenceScore}
            rawSnapshot={rawSnapshot}
            gradCamImage={gradCamImage}
            isoContourImage={isoContourImage}
            calculatedAreaRatio={calculatedAreaRatio}
          />

          <PathologyReportCard
            topPrediction={topPrediction}
            confidenceScore={confidenceScore}
            isHighRisk={isHighRisk}
            topPredictions={topPredictions}
            vlmReport={vlmReport}
            isVlmLoading={isVlmLoading}
            vlmError={vlmError}
            hasScanData={Boolean(rawSnapshot && topPrediction)}
            onGenerateReport={handleGenerateClinicalReport}
          />

          <BiometricsPanel
            topPredictions={topPredictions}
            erythemaIndex={erythemaIndex}
            skinTypePrediction={skinTypePrediction}
            abcdData={abcdData}
            patientContext={patientContext}
            onPatientContextChange={setPatientContext}
            interventions={vlmReport?.recommended_interventions || []}
            isVlmLoading={isVlmLoading}
          />
        </main>
      )}
    </div>
  );
}