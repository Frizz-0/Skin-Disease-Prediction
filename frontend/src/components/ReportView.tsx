import { useState, useMemo } from 'react';
import {
    Printer,
    Copy,
    Check,
    ArrowLeft,
    Sparkles,
    Loader2,
    ShieldAlert,
    ShieldCheck,
    Scan,
    Activity,
    FileText,
    AlertCircle,
    Pill,
    Microscope,
    User,
    MapPin,
    Clock,
    ClipboardList,
    Stethoscope
} from 'lucide-react';
import { FITZPATRICK_LABELS } from '../types/clinical';
import type { VlmClinicalReport, PatientContext } from '../types/clinical';

interface ReportViewProps {
    rawSnapshot: string | null;
    isoContourImage: string | null;
    calculatedAreaRatio: number;
    topPrediction: { className: string; probability: number } | null;
    topPredictions: Array<{ className: string; probability: number }> | null;
    confidenceScore: number;
    isHighRisk: boolean;
    erythemaIndex: number;
    skinTypePrediction: number | null;
    patientContext: PatientContext;
    vlmReport: VlmClinicalReport | null;
    isVlmLoading: boolean;
    vlmError: string | null;
    onGenerateReport: () => void;
    onBackToAnalyze: () => void;
}

export default function ReportView({
    rawSnapshot,
    isoContourImage,
    calculatedAreaRatio,
    topPrediction,
    topPredictions,
    confidenceScore,
    isHighRisk,
    erythemaIndex,
    skinTypePrediction,
    patientContext,
    vlmReport,
    isVlmLoading,
    vlmError,
    onGenerateReport,
    onBackToAnalyze
}: ReportViewProps) {
    const [copied, setCopied] = useState(false);

    const reportMeta = useMemo(() => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        const timeStr = now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit'
        });
        const sessionCode = `CUTIS-${now.getFullYear()}-${String(now.getHours()).padStart(2, '0')}${String(
            now.getMinutes()
        ).padStart(2, '0')}`;
        return { dateStr, timeStr, sessionCode };
    }, [rawSnapshot]);

    if (!rawSnapshot || !topPrediction) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/85 backdrop-blur-2xl rounded-[32px] p-8 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.04)] text-center flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#b84c35]/12 text-[#b84c35] flex items-center justify-center">
                        <Scan className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800">No Scan Available for Report</h2>
                        <p className="text-xs sm:text-[13px] text-slate-500 mt-1.5 leading-relaxed">
                            Capture a live skin image or upload a dermoscopic photo in the Scanner workspace first to generate your clinical summary.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onBackToAnalyze}
                        className="mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white text-xs font-bold tracking-wide shadow-[0_6px_20px_rgba(184,76,53,0.28)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Scanner
                    </button>
                </div>
            </div>
        );
    }

    const displayAge = patientContext.age?.trim()
        ? `${patientContext.age.trim()} yrs`
        : 'Not specified';
    const displayGender = patientContext.gender?.trim() || 'Not specified';
    const displayLocation = patientContext.bodyLocation?.trim() || 'Not specified';
    const displayDuration = patientContext.duration?.trim() || 'Not specified';
    const displaySymptoms =
        patientContext.symptoms && patientContext.symptoms.length > 0
            ? patientContext.symptoms.join(', ')
            : 'Not specified';
    const displaySpecifics = patientContext.clinicalNotes?.trim() || 'Not specified';

    const derm = vlmReport?.dermoscopic_report;
    const histology = vlmReport?.histological_context;
    const symptoms = vlmReport?.symptoms_and_signs || [];
    const treatments = vlmReport?.recommended_treatments || [];
    const interventions = vlmReport?.recommended_interventions || [];

    const severityLabel = derm?.severity_level || (isHighRisk ? 'ELEVATED' : 'LOW');
    const isElevatedAttention =
        isHighRisk || severityLabel === 'HIGH' || severityLabel === 'ELEVATED';

    const handleCopySummary = async () => {
        const lines = [
            `CUTIS DERM AI — CLINICAL ASSESSMENT BRIEF (${reportMeta.sessionCode})`,
            `Date: ${reportMeta.dateStr} at ${reportMeta.timeStr}`,
            `Primary Finding: ${topPrediction.className} (${confidenceScore}% confidence)`,
            `Attention Level: ${severityLabel}`,
            `Age: ${displayAge} | Gender: ${displayGender}`,
            `Anatomical Site: ${displayLocation} | Duration: ${displayDuration}`,
            `Reported Symptoms: ${displaySymptoms}`,
            `Other Specifics: ${displaySpecifics}`,
            `Active Saliency Area: ${calculatedAreaRatio}% | Optical Erythema Index: +${erythemaIndex}%`,
            skinTypePrediction
                ? `Fitzpatrick Phototype: Type ${FITZPATRICK_LABELS[skinTypePrediction - 1]}`
                : '',
            '',
            derm ? `DERMOSCOPIC VISUAL ANALYSIS:\n${derm.visual_summary}\n\nEXTENT & TISSUE INVOLVEMENT:\n${derm.extent_affected}` : '',
            histology ? `\nCONDITION OVERVIEW (${histology.icd10}):\n${histology.description}` : '',
            symptoms.length > 0 ? `\nCLINICAL SYMPTOMS & SIGNS:\n${symptoms.map((s) => `- ${s}`).join('\n')}` : '',
            treatments.length > 0
                ? `\nCARE & MANAGEMENT:\n${treatments.map((t) => `- ${t.method} [${t.modality}]: ${t.details}`).join('\n')}`
                : '',
            interventions.length > 0
                ? `\nRECOMMENDED NEXT STEPS:\n${interventions.map((i) => `- [${i.urgency}] ${i.name}`).join('\n')}`
                : '',
            '\nDisclaimer: AI-assisted screening summary for preliminary clinical triage only.'
        ].filter(Boolean);

        try {
            await navigator.clipboard.writeText(lines.join('\n'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        } catch (err) {
            console.error('Failed to copy report:', err);
        }
    };

    return (
        <div className="max-w-5xl w-full mx-auto flex flex-col gap-4 select-text pb-8 print:max-w-none print:p-0 print:pb-0 print:gap-0">
            {/* Top Action Toolbar (Hidden in PDF Export) */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 bg-white/85 backdrop-blur-2xl p-3 sm:px-5 sm:py-3 rounded-[24px] border border-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.03)] print:hidden">
                <button
                    type="button"
                    onClick={onBackToAnalyze}
                    className="order-2 sm:order-1 w-full sm:w-auto justify-center px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-full bg-stone-200/70 hover:bg-stone-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95"
                >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span>Back to Scanner</span>
                </button>

                {!vlmReport && (
                    <button
                        type="button"
                        onClick={onGenerateReport}
                        disabled={isVlmLoading}
                        className="col-span-2 order-1 sm:order-2 sm:ml-auto w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-full bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white text-xs font-bold shadow-sm hover:brightness-105 whitespace-nowrap transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-60"
                    >
                        {isVlmLoading ? (
                            <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{isVlmLoading ? 'Generating VLM Details...' : 'Generate Full VLM Report'}</span>
                    </button>
                )}

                <button
                    type="button"
                    onClick={handleCopySummary}
                    className={`order-3 ${vlmReport ? 'sm:ml-auto' : ''
                        } hidden sm:flex justify-center px-4 py-2 rounded-full bg-stone-200/70 hover:bg-stone-200 text-slate-700 text-xs font-semibold items-center gap-1.5 whitespace-nowrap transition-all active:scale-95`}
                >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy Text'}</span>
                </button>

                <button
                    type="button"
                    onClick={() => window.print()}
                    className="order-4 w-full sm:w-auto justify-center px-3.5 sm:px-4 py-2.5 sm:py-2 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm whitespace-nowrap transition-all active:scale-95"
                >
                    <Printer className="w-3.5 h-3.5 shrink-0" />
                    <span>Print / Save PDF</span>
                </button>
            </div>

            {/* Main Clinical Document Sheet */}
            <article className="cutis-print-sheet bg-white rounded-[32px] p-5 sm:p-8 border border-stone-200/80 shadow-[0_16px_50px_rgba(38,29,26,0.05)] flex flex-col gap-5 print:rounded-none print:border-0 print:shadow-none print:p-0 print:gap-3">
                {/* Top Brand & Session Strip */}
                <div className="rounded-2xl bg-gradient-to-r from-[#281d19] via-[#3a2822] to-[#281d19] text-white px-5 py-3.5 print:px-4 print:py-2.5 flex items-center justify-between gap-3 border border-[#cfa06e]/40 break-inside-avoid">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#b84c35] to-[#cfa06e] p-[1.5px] shrink-0">
                            <div className="w-full h-full rounded-[10px] bg-[#281d19] flex items-center justify-center">
                                <svg
                                    viewBox="0 0 24 24"
                                    className="w-5 h-5 text-[#e8c79e]"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M17.5 7.2A7 7 0 1 0 17.5 16.8" />
                                    <path
                                        d="M12.5 12c2.2-2.2 5-2.2 6.5-1.5-.7 1.5-.7 4.3-2.9 6.5-1.4 1.4-3.2 1.2-4.1.3-.9-.9-1.1-2.7.5-5.3Z"
                                        strokeWidth="1.6"
                                    />
                                </svg>
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-base font-extrabold tracking-tight text-white">CUTIS</span>
                                <span className="text-[10px] font-bold tracking-[0.16em] uppercase px-2 py-0.5 rounded bg-[#cfa06e]/20 text-[#e8c79e] border border-[#cfa06e]/40">
                                    DERM AI
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-300 mt-0.5 truncate">
                                Cutaneous Triage & Dermoscopic Saliency Report
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 text-xs shrink-0 whitespace-nowrap">
                        <span className="font-mono font-bold text-[#e8c79e] bg-white/10 px-2.5 py-0.5 rounded-md border border-[#cfa06e]/30">
                            {reportMeta.sessionCode}
                        </span>
                        <span className="text-[11px] text-stone-300">
                            {reportMeta.dateStr} • {reportMeta.timeStr}
                        </span>
                    </div>
                </div>

                {/* Primary Finding & Attention Level Banner */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50/90 px-5 py-3.5 print:px-4 print:py-2.5 rounded-2xl border border-stone-200/80 break-inside-avoid">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#b84c35] block">
                            Primary AI Classification
                        </span>
                        <h1 className="text-xl sm:text-2xl print:text-lg font-extrabold text-slate-900 tracking-tight capitalize mt-0.5">
                            {topPrediction.className}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                                Confidence
                            </span>
                            <span className="text-sm font-mono font-extrabold text-slate-800">
                                {confidenceScore}%
                            </span>
                        </div>

                        {isElevatedAttention ? (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-bold text-xs whitespace-nowrap">
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                Attention: {severityLabel}
                            </span>
                        ) : severityLabel === 'MODERATE' ? (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs whitespace-nowrap">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                Attention: MODERATE
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs whitespace-nowrap">
                                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                Attention: {severityLabel}
                            </span>
                        )}
                    </div>
                </div>

                {/* Structured Patient Demographics & Clinical Specifics Grid */}
                <div className="bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 break-inside-avoid">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <ClipboardList className="w-3.5 h-3.5 text-[#b84c35]" /> Patient Demographics & Clinical Context
                        </h2>
                        <span className="text-[11px] text-slate-400">Assessed by CUTIS Derm AI</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-2">
                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                <User className="w-3 h-3 text-[#b84c35]" /> Age
                            </span>
                            <span
                                className={`text-xs font-bold block mt-0.5 whitespace-nowrap ${displayAge === 'Not specified' ? 'text-slate-400 italic font-medium' : 'text-slate-800'
                                    }`}
                            >
                                {displayAge}
                            </span>
                        </div>

                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                                Gender / Sex
                            </span>
                            <span
                                className={`text-xs font-bold block mt-0.5 whitespace-nowrap ${displayGender === 'Not specified' ? 'text-slate-400 italic font-medium' : 'text-slate-800'
                                    }`}
                            >
                                {displayGender}
                            </span>
                        </div>

                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-[#b84c35]" /> Anatomical Site
                            </span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5 whitespace-nowrap">
                                {displayLocation}
                            </span>
                        </div>

                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#b84c35]" /> Duration
                            </span>
                            <span className="text-xs font-bold text-slate-800 block mt-0.5 whitespace-nowrap">
                                {displayDuration}
                            </span>
                        </div>

                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                                Reported Symptoms
                            </span>
                            <span
                                className={`text-xs font-bold block mt-0.5 leading-snug ${displaySymptoms === 'Not specified'
                                        ? 'text-slate-400 italic font-medium'
                                        : 'text-[#b84c35]'
                                    }`}
                            >
                                {displaySymptoms}
                            </span>
                        </div>

                        <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide block">
                                Other Specifics
                            </span>
                            <span
                                className={`text-xs font-bold block mt-0.5 leading-snug ${displaySpecifics === 'Not specified' ? 'text-slate-400 italic font-medium' : 'text-slate-800'
                                    }`}
                            >
                                {displaySpecifics}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Visual Imaging Evidence + Top-5 Differentials & Biometrics */}
                <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-4 print:gap-3 items-stretch break-inside-avoid">
                    {/* Left 6 Cols: Optical & XAI Saliency Maps */}
                    <div className="md:col-span-6 print:col-span-6 bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col justify-between gap-3">
                        <div className="flex justify-between items-center gap-2">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Dermoscopic & XAI Saliency
                            </h2>
                            <span className="text-[11px] font-mono font-semibold text-[#b84c35] bg-[#b84c35]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                                Saliency Area: {calculatedAreaRatio}%
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-200">
                                    <img
                                        src={rawSnapshot}
                                        alt="Original Optical Capture"
                                        className="w-full h-full block object-contain"
                                    />
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500 text-center">
                                    1. Optical Capture (224×224)
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-950 border border-stone-200">
                                    <img
                                        src={isoContourImage || rawSnapshot}
                                        alt="Iso-Contour Saliency Overlay"
                                        className="w-full h-full block object-contain"
                                    />
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500 text-center">
                                    2. Grad-CAM Iso-Contour Map
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70 flex items-center justify-between gap-1">
                                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                                    <Activity className="w-3.5 h-3.5 text-[#b84c35] shrink-0" /> Erythema
                                </span>
                                <span className="text-xs font-mono font-extrabold text-slate-800 whitespace-nowrap">
                                    +{erythemaIndex}%
                                </span>
                            </div>

                            <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70 flex items-center justify-between gap-1">
                                <span className="text-[11px] text-slate-500 font-semibold">Fitzpatrick</span>
                                <span className="text-xs font-extrabold text-slate-800 whitespace-nowrap">
                                    {skinTypePrediction
                                        ? `Type ${FITZPATRICK_LABELS[skinTypePrediction - 1]}`
                                        : 'Not specified'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right 6 Cols: Top-5 Model Differentials */}
                    <div className="md:col-span-6 print:col-span-6 bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col justify-between gap-2">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Top-5 Model Differentials
                            </h2>
                            <span className="text-[11px] font-bold text-[#b84c35]">
                                {confidenceScore}% Top Match
                            </span>
                        </div>

                        <div className="space-y-2 print:space-y-1.5 my-auto">
                            {(topPredictions || []).slice(0, 5).map((pred, idx) => {
                                const pct = Math.round(pred.probability * 100);
                                const isPrimary = idx === 0;

                                return (
                                    <div
                                        key={idx}
                                        className={`rounded-xl px-3 py-2 print:py-1.5 border ${isPrimary
                                                ? 'bg-gradient-to-r from-[#b84c35]/10 via-[#cfa06e]/10 to-white border-[#b84c35]/35'
                                                : 'bg-white border-stone-200/80'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 ${isPrimary
                                                            ? 'bg-[#b84c35] text-white'
                                                            : 'bg-stone-100 text-slate-500 border border-stone-200'
                                                        }`}
                                                >
                                                    {idx + 1}
                                                </span>
                                                <span
                                                    className={`text-xs capitalize truncate ${isPrimary ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                                                        }`}
                                                >
                                                    {pred.className}
                                                </span>
                                            </div>

                                            <span
                                                className={`text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${isPrimary
                                                        ? 'bg-[#b84c35]/15 text-[#b84c35]'
                                                        : 'bg-stone-100 text-slate-600'
                                                    }`}
                                            >
                                                {pct}%
                                            </span>
                                        </div>

                                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isPrimary
                                                        ? 'bg-gradient-to-r from-[#b84c35] to-[#cfa06e]'
                                                        : 'bg-slate-400'
                                                    }`}
                                                style={{ width: `${Math.max(pct, 4)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* ===================================================================
            VLM CLINICAL NARRATIVE & CARE GUIDANCE
           =================================================================== */}
                {vlmError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                        {vlmError}
                    </div>
                )}

                {vlmReport ? (
                    <div className="flex flex-col gap-4 print:gap-3">
                        {/* Full-Width Dermoscopic Visual Analysis Card (Fills Bottom of Page 1 Cleanly) */}
                        <div className="bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col gap-2.5 break-inside-avoid">
                            <div className="flex items-center justify-between gap-2 border-b border-stone-200/70 pb-2">
                                <div className="flex items-center gap-2">
                                    <Microscope className="w-4 h-4 text-[#b84c35]" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Dermoscopic Visual Analysis
                                    </h2>
                                </div>
                                {derm?.severity_rationale && (
                                    <span className="text-[11px] font-semibold text-[#b84c35] truncate max-w-[60%]">
                                        {derm.severity_rationale}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-3">
                                <div className="md:col-span-7 print:col-span-7 flex flex-col justify-between gap-2">
                                    <p className="text-xs sm:text-[13px] print:text-[11px] text-slate-700 leading-relaxed">
                                        {derm?.visual_summary}
                                    </p>
                                    <div className="bg-white px-3 py-2 rounded-xl border border-stone-200/70">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                                            Extent & Tissue Involvement
                                        </span>
                                        <p className="text-xs print:text-[11px] text-slate-700 leading-relaxed mt-0.5">
                                            {derm?.extent_affected}
                                        </p>
                                    </div>
                                </div>

                                <div className="md:col-span-5 print:col-span-5 bg-white p-3 rounded-xl border border-stone-200/70 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                                            Key Morphological Features
                                        </span>
                                        {derm?.other_findings && derm.other_findings.length > 0 ? (
                                            <ul className="space-y-1 text-xs print:text-[11px] text-slate-700">
                                                {derm.other_findings.map((f, i) => (
                                                    <li key={i} className="flex items-start gap-2 leading-snug">
                                                        <span className="text-[#b84c35] font-bold">•</span>
                                                        <span>{f}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-xs text-slate-400 italic">No secondary anomalies noted.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Condition Overview & Clinical Signs */}
                        <div className="bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col gap-2.5 break-inside-avoid">
                            <div className="flex items-center justify-between gap-2 border-b border-stone-200/70 pb-2">
                                <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-[#b84c35]" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Condition Overview & Clinical Signs
                                    </h2>
                                </div>
                                {histology?.icd10 && (
                                    <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-0.5 rounded-full border border-stone-200 text-slate-700 shrink-0">
                                        ICD-10: {histology.icd10}
                                    </span>
                                )}
                            </div>

                            <p className="text-xs sm:text-[13px] print:text-[11.5px] text-slate-700 leading-relaxed">
                                {histology?.description}
                            </p>

                            {symptoms.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2 pt-1">
                                    {symptoms.map((sym, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white px-3 py-2 rounded-xl border border-stone-200/70 text-xs print:text-[11px] text-slate-700 leading-snug flex items-start gap-2"
                                        >
                                            <span className="text-[#b84c35] font-bold mt-0.5">•</span>
                                            <span>{sym}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Care & Management Modalities (2-Column Grid) */}
                        {treatments.length > 0 && (
                            <div className="bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col gap-2.5 break-inside-avoid">
                                <div className="flex items-center gap-2 border-b border-stone-200/70 pb-2">
                                    <Pill className="w-4 h-4 text-[#b84c35]" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Care & Management Guidance
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-2.5">
                                    {treatments.map((tx, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white p-3 rounded-xl border border-stone-200/80"
                                        >
                                            <div className="flex justify-between items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-800">{tx.method}</span>
                                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#b84c35]/10 text-[#b84c35] shrink-0">
                                                    {tx.modality}
                                                </span>
                                            </div>
                                            <p className="text-xs print:text-[11px] text-slate-600 leading-relaxed">
                                                {tx.details}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended Next Steps */}
                        {interventions.length > 0 && (
                            <div className="bg-stone-50/90 rounded-2xl p-4 print:p-3 border border-stone-200/80 flex flex-col gap-2 break-inside-avoid">
                                <div className="flex items-center gap-2 border-b border-stone-200/70 pb-2">
                                    <Stethoscope className="w-4 h-4 text-[#b84c35]" />
                                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                        Recommended Next Steps
                                    </h2>
                                </div>

                                <div className="space-y-1.5">
                                    {interventions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white px-3.5 py-2 rounded-xl border border-stone-200/80 flex items-center justify-between gap-3 text-xs"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="w-5 h-5 rounded-full bg-stone-100 text-slate-600 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    {idx + 1}
                                                </span>
                                                <span className="font-semibold text-slate-800 leading-snug">
                                                    {item.name}
                                                </span>
                                            </div>

                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide shrink-0 ${item.urgency === 'IMMEDIATE'
                                                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                                        : item.urgency === 'SHORT_TERM'
                                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    }`}
                                            >
                                                {item.urgency}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-stone-50 rounded-2xl p-6 border border-dashed border-stone-300 text-center flex flex-col items-center gap-3 print:hidden">
                        <p className="text-xs sm:text-[13px] text-slate-500">
                            Detailed VLM visual observations, symptoms, and care recommendations have not been generated for this scan yet.
                        </p>
                        <button
                            type="button"
                            onClick={onGenerateReport}
                            disabled={isVlmLoading}
                            className="px-5 py-2.5 rounded-full bg-[#b84c35] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            {isVlmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isVlmLoading ? 'Generating VLM Analysis...' : 'Generate Detailed VLM Section'}
                        </button>
                    </div>
                )}

                {/* Integrated Clinical Disclaimer Footer */}
                <footer className="border-t border-stone-200 pt-2.5 text-[11px] print:text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-2 break-inside-avoid">
                    <span>
                        <strong className="font-bold text-slate-700">Clinical Decision-Support Notice:</strong> Generated for preliminary screening and triage support only. Always confirm findings via in-person dermatological examination.
                    </span>
                    <span className="font-mono font-bold text-[#b84c35]">CUTIS DERM AI</span>
                </footer>
            </article>
        </div>
    );
}