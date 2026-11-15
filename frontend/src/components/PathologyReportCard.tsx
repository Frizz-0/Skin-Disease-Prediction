import { useState, useEffect, type MouseEvent } from 'react';
import {
    BookmarkCheck,
    ListOrdered,
    ChevronUp,
    ChevronDown,
    Microscope,
    FileText,
    AlertCircle,
    CheckCircle2,
    Stethoscope,
    Pill,
    Sparkles,
    Loader2
} from 'lucide-react';
import type { VlmClinicalReport } from '../types/clinical';

interface PathologyReportCardProps {
    topPrediction: { className: string; probability: number } | null;
    confidenceScore: number;
    isHighRisk: boolean;
    topPredictions: Array<{ className: string; probability: number }> | null;
    vlmReport: VlmClinicalReport | null;
    isVlmLoading: boolean;
    vlmError: string | null;
    hasScanData: boolean;
    onGenerateReport: () => void;
}

export default function PathologyReportCard({
    topPrediction,
    confidenceScore,
    isHighRisk,
    topPredictions,
    vlmReport,
    isVlmLoading,
    vlmError,
    hasScanData,
    onGenerateReport
}: PathologyReportCardProps) {
    const [cardMouse, setCardMouse] = useState<{ x: number; y: number }>({ x: 180, y: 150 });
    const [isFlaggedForBiopsy, setIsFlaggedForBiopsy] = useState<boolean>(false);
    const [accordions, setAccordions] = useState<{ [key: string]: boolean }>({
        diff: true,
        analysis: true,
        description: false,
        symptoms: false,
        treatments: false
    });

    useEffect(() => {
        if (vlmReport) {
            setAccordions({
                diff: false,
                analysis: true,
                description: true,
                symptoms: true,
                treatments: true
            });
        }
    }, [vlmReport]);

    const toggleAccordion = (key: string) => {
        setAccordions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setCardMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const dermReport = vlmReport?.dermoscopic_report;
    const symptomsList = vlmReport?.symptoms_and_signs;
    const treatmentsList = vlmReport?.recommended_treatments;
    const histology = vlmReport?.histological_context;

    const renderEmptyPlaceholder = () => (
        <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center text-[11px] text-white/75 italic">
            {isVlmLoading ? 'Generating report...' : 'Data will be visible once the report is generated'}
        </div>
    );

    return (
        <section className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col">
            <div
                onMouseMove={handleMouseMove}
                style={{
                    background: `radial-gradient(420px circle at ${cardMouse.x}px ${cardMouse.y}px, rgba(255, 255, 255, 0.22), transparent 70%), linear-gradient(155deg, #E7836D 0%, #E7836D 50%, #FE7C97 100%)`
                }}
                className="rounded-[34px] p-5 sm:p-6 shadow-[0_20px_50px_rgba(225,95,69,0.35)] flex flex-col text-white justify-between relative overflow-hidden flex-1 border border-white/40 transition-all duration-300"
            >
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0c_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none opacity-70" />

                <div className="relative z-10 flex flex-col gap-4">
                    {/* Top Title Bar */}
                    <div className="flex justify-between items-start border-b border-white/20 pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-extrabold tracking-tight">Pathology Report</h3>
                                {vlmReport && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[9px] font-bold border border-white/30">
                                        <Sparkles className="w-2.5 h-2.5" /> AI REPORT
                                    </span>
                                )}
                            </div>
                            <p className="text-white/80 text-xs mt-0.5">
                                {isVlmLoading
                                    ? 'Analyzing image and generating report...'
                                    : topPrediction
                                        ? 'Scan Assessment Ready'
                                        : 'Awaiting Target Acquisition'}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsFlaggedForBiopsy(prev => !prev)}
                            title="Bookmark Assessment"
                            className={`p-2 rounded-2xl border transition-all active:scale-95 ${isFlaggedForBiopsy
                                ? 'bg-white text-[#c8452e] border-white shadow-md scale-105'
                                : 'bg-white/15 text-white/90 border-white/25 hover:bg-white/25'
                                }`}
                        >
                            <BookmarkCheck className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Radiometric Circular Gauge */}
                    <div className="flex flex-col items-center justify-center pt-1 pb-2">
                        <div className="relative w-48 h-48 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 140 140">
                                <circle cx="70" cy="70" r="64" fill="none" stroke="rgba(255, 255, 255, 0.18)" strokeWidth="7" />
                                <circle
                                    cx="70"
                                    cy="70"
                                    r="64"
                                    fill="none"
                                    stroke="#ffffff"
                                    strokeWidth="8"
                                    strokeDasharray={339.3}
                                    strokeDashoffset={topPrediction ? 339.3 - (339.3 * confidenceScore) / 100 : 339.3}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out filter drop-shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                                />
                            </svg>

                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4 translate-y-2">
                                <span className="text-[10px] font-bold tracking-widest text-white/75 uppercase mb-1">CONFIDENCE SCORE</span>
                                <div className="flex items-baseline justify-center">
                                    <span className="text-5xl sm:text-6xl font-black tracking-tight text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
                                        {confidenceScore}
                                    </span>
                                    <span className="text-sm font-bold text-white/70 ml-1">/100</span>
                                </div>
                                <span className="text-[11px] font-semibold text-white/95 mt-1 truncate max-w-[140px]">
                                    {topPrediction ? topPrediction.className : 'Awaiting Scan'}
                                </span>
                            </div>
                        </div>

                        <div className="mt-2">
                            {isHighRisk || dermReport?.severity_level === 'CRITICAL' || dermReport?.severity_level === 'SEVERE' ? (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[#c8452e] text-[11px] font-bold shadow-md tracking-wide">
                                    {dermReport ? `PRIORITY: ${dermReport.severity_level}` : 'HIGH PRIORITY : CONSULT SPECIALIST'}
                                </span>
                            ) : topPrediction ? (
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[11px] font-bold border border-white/30">
                                    {dermReport ? `SEVERITY: ${dermReport.severity_level}` : 'LOW RISK PATTERN'}
                                </span>
                            ) : (
                                <span className="text-xs text-white/70 italic">Sensing cutaneous lesion target...</span>
                            )}
                        </div>
                    </div>

                    {/* Sequential Accordions */}
                    <div className="flex flex-col gap-2.5 mt-1">
                        {/* 01 // Top-5 Differentials (From Classifier) */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden transition-all">
                            <button type="button" onClick={() => toggleAccordion('diff')} className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <ListOrdered className="w-4 h-4 text-white/90" />
                                    <span className="text-xs font-bold tracking-wide">TOP-5 DIFFERENTIAL DIAGNOSES</span>
                                </div>
                                {accordions.diff ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
                            </button>

                            {accordions.diff && (
                                <div className="p-3 pt-0 space-y-2 border-t border-white/10 mt-1">
                                    {topPredictions && topPredictions.length > 0 ? (
                                        topPredictions.slice(0, 5).map((item, idx) => {
                                            const pct = Math.round(item.probability * 100);
                                            const isLeader = idx === 0;
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-2 rounded-xl border transition-all ${isLeader ? 'bg-white/25 border-white/40 shadow-xs' : 'bg-white/10 border-white/15'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-center text-[11px] mb-1">
                                                        <div className="flex items-center gap-1.5 truncate pr-2">
                                                            <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[8px] font-bold">
                                                                0{idx + 1}
                                                            </span>
                                                            <span className="font-semibold truncate">{item.className}</span>
                                                        </div>
                                                        <span className="font-mono font-bold text-white text-[11px] shrink-0">{pct}%</span>
                                                    </div>
                                                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                                                        <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-center text-[11px] text-white/75 italic">
                                            Run a skin scan to view top predictions
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 02 // Dermoscopic Visual Report */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden transition-all">
                            <button type="button" onClick={() => toggleAccordion('analysis')} className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Microscope className="w-4 h-4 text-white/90" />
                                    <span className="text-xs font-bold tracking-wide">DERMOSCOPIC VISUAL REPORT</span>
                                </div>
                                {accordions.analysis ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
                            </button>

                            {accordions.analysis && (
                                <div className="p-3 pt-0 space-y-2 border-t border-white/10 mt-1 text-[11px]">
                                    {dermReport ? (
                                        <>
                                            <div className="bg-white/15 p-2.5 rounded-xl border border-white/25">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] text-amber-200 font-bold tracking-wider">VISUAL OBSERVATION</span>
                                                    <span className="text-[9px] font-extrabold bg-white/20 px-2 py-0.5 rounded-full">
                                                        {dermReport.severity_level}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-white leading-relaxed">{dermReport.visual_summary}</p>
                                            </div>

                                            <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                                                <span className="text-[10px] text-white/70 font-semibold block mb-0.5">EXTENT & TISSUE INVOLVEMENT</span>
                                                <p className="font-medium text-white leading-relaxed">{dermReport.extent_affected}</p>
                                                <p className="text-[10px] text-amber-100 mt-1">{dermReport.severity_rationale}</p>
                                            </div>

                                            {dermReport.other_findings && dermReport.other_findings.length > 0 && (
                                                <div className="bg-white/10 p-2 rounded-xl border border-white/10">
                                                    <span className="text-[10px] text-white/70 font-semibold block mb-1">OTHER FINDINGS</span>
                                                    <ul className="space-y-1">
                                                        {dermReport.other_findings.map((finding, idx) => (
                                                            <li key={idx} className="text-white leading-snug flex items-start gap-1.5">
                                                                <span className="text-amber-200 font-bold">•</span>
                                                                <span>{finding}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        renderEmptyPlaceholder()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 03 // Histological / Condition Description */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden transition-all">
                            <button type="button" onClick={() => toggleAccordion('description')} className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-white/90" />
                                    <span className="text-xs font-bold tracking-wide">CONDITION DESCRIPTION</span>
                                </div>
                                {accordions.description ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
                            </button>

                            {accordions.description && (
                                <div className="p-3 pt-0 space-y-2 border-t border-white/10 mt-1 text-[11px]">
                                    {histology ? (
                                        <>
                                            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 leading-relaxed text-white/95">
                                                {histology.description}
                                            </div>
                                            {histology.icd10 && (
                                                <div className="flex justify-between items-center bg-white/10 p-2 rounded-xl border border-white/10 text-[11px]">
                                                    <span className="text-white/70">Reference Code:</span>
                                                    <span className="font-mono font-bold text-white">{histology.icd10}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        renderEmptyPlaceholder()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 04 // Clinical Symptoms & Signs */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden transition-all">
                            <button type="button" onClick={() => toggleAccordion('symptoms')} className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-white/90" />
                                    <span className="text-xs font-bold tracking-wide">CLINICAL SYMPTOMS & SIGNS</span>
                                </div>
                                {accordions.symptoms ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
                            </button>

                            {accordions.symptoms && (
                                <div className="p-3 pt-0 space-y-1.5 border-t border-white/10 mt-1 text-[11px]">
                                    {symptomsList && symptomsList.length > 0 ? (
                                        symptomsList.map((symptom, sIdx) => (
                                            <div key={sIdx} className="flex items-start gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                                                <CheckCircle2 className="w-4 h-4 text-amber-200 shrink-0 mt-0.5" />
                                                <span className="text-white leading-tight font-medium">{symptom}</span>
                                            </div>
                                        ))
                                    ) : (
                                        renderEmptyPlaceholder()
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 05 // Recommended Treatments */}
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden transition-all">
                            <button type="button" onClick={() => toggleAccordion('treatments')} className="w-full p-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-2">
                                    <Pill className="w-4 h-4 text-white/90" />
                                    <span className="text-xs font-bold tracking-wide">RECOMMENDED TREATMENTS</span>
                                </div>
                                {accordions.treatments ? <ChevronUp className="w-4 h-4 text-white/80" /> : <ChevronDown className="w-4 h-4 text-white/80" />}
                            </button>

                            {accordions.treatments && (
                                <div className="p-3 pt-0 space-y-1.5 border-t border-white/10 mt-1 text-[11px]">
                                    {treatmentsList && treatmentsList.length > 0 ? (
                                        treatmentsList.map((tx, idx) => (
                                            <div key={idx} className="bg-white/10 p-2.5 rounded-xl border border-white/15 space-y-1">
                                                <div className="flex justify-between items-center gap-2">
                                                    <span className="font-bold text-white">{tx.method}</span>
                                                    <span className="text-[9px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded-full shrink-0">
                                                        {tx.modality}
                                                    </span>
                                                </div>
                                                <p className="text-white/90 leading-snug text-[10px]">{tx.details}</p>
                                            </div>
                                        ))
                                    ) : (
                                        renderEmptyPlaceholder()
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* On-Click VLM Action Button */}
                <div className="mt-4 relative z-10">
                    {vlmError && (
                        <div className="mb-2 px-3 py-2 rounded-xl bg-black/25 border border-white/20 text-[11px] text-amber-100 text-center">
                            {vlmError}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onGenerateReport}
                        disabled={!hasScanData || isVlmLoading}
                        className={`w-full py-3.5 rounded-[20px] text-xs font-black shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200 flex items-center justify-center gap-2 ${!hasScanData
                            ? 'bg-white/35 text-white/75 cursor-not-allowed'
                            : isVlmLoading
                                ? 'bg-white/90 text-[#c8452e] cursor-wait'
                                : 'bg-white text-[#c8452e] hover:bg-stone-50 active:scale-[0.98] hover:shadow-[0_6px_24px_rgba(0,0,0,0.22)] cursor-pointer'
                            }`}
                    >
                        {isVlmLoading ? (
                            <Loader2 className="w-4 h-4 text-[#c8452e] animate-spin" />
                        ) : (
                            <Stethoscope className="w-4 h-4 text-[#c8452e]" />
                        )}
                        {!hasScanData
                            ? 'SCAN LESION TO ENABLE REPORT'
                            : isVlmLoading
                                ? 'GENERATING CLINICAL REPORT...'
                                : vlmReport
                                    ? 'REGENERATE CLINICAL REPORT'
                                    : 'GENERATE CLINICAL REPORT'}
                    </button>
                </div>
            </div>
        </section>
    );
}