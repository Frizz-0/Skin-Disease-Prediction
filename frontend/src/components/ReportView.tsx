import { useState, useMemo } from 'react';
import {
    Printer,
    Copy,
    Check,
    ArrowLeft,
    Sparkles,
    Stethoscope,
    Loader2,
    ShieldAlert,
    ShieldCheck,
    Scan,
    CheckSquare,
    Square,
    Activity,
    FileText,
    AlertCircle,
    Pill,
    Microscope
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
    abcdData: Array<{ label: string; value: string; checked: boolean }>;
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
    abcdData,
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
        const sessionCode = `DERM-${now.getFullYear()}-${String(now.getHours()).padStart(2, '0')}${String(
            now.getMinutes()
        ).padStart(2, '0')}`;
        return { dateStr, timeStr, sessionCode };
    }, [rawSnapshot]);

    if (!rawSnapshot || !topPrediction) {
        return (
            <div className="flex-1 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/80 backdrop-blur-2xl rounded-[32px] p-8 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.04)] text-center flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#e4765d]/15 text-[#e4765d] flex items-center justify-center">
                        <Scan className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">No Scan Available for Report</h2>
                        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                            Capture a live skin image or upload a dermoscopic photo in the Analyze workspace first to generate your printable clinical summary.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onBackToAnalyze}
                        className="mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-[#e4765d] to-[#eb866f] text-white text-xs font-bold tracking-wide shadow-[0_6px_20px_rgba(228,118,93,0.3)] hover:brightness-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        GO TO ANALYZE SCANNER
                    </button>
                </div>
            </div>
        );
    }

    const derm = vlmReport?.dermoscopic_report;
    const histology = vlmReport?.histological_context;
    const symptoms = vlmReport?.symptoms_and_signs || [];
    const treatments = vlmReport?.recommended_treatments || [];
    const interventions = vlmReport?.recommended_interventions || [];

    const handleCopySummary = async () => {
        const reportedSymptomsStr =
            patientContext.symptoms.length > 0 ? patientContext.symptoms.join(', ') : 'None reported';

        const lines = [
            `DERMATOLOGY AI CLINICAL BRIEF (${reportMeta.sessionCode})`,
            `Date: ${reportMeta.dateStr} ${reportMeta.timeStr}`,
            `Primary Finding: ${topPrediction.className} (${confidenceScore}% confidence)`,
            `Attention Level: ${derm?.severity_level || (isHighRisk ? 'ELEVATED' : 'LOW')}`,
            `Anatomical Location: ${patientContext.bodyLocation} | Duration: ${patientContext.duration}`,
            `Patient-Reported Symptoms: ${reportedSymptomsStr}`,
            `Active Lesion Area Ratio: ${calculatedAreaRatio}% | Optical Erythema Index: +${erythemaIndex}%`,
            skinTypePrediction ? `Estimated Fitzpatrick Phototype: Type ${FITZPATRICK_LABELS[skinTypePrediction - 1]}` : '',
            '',
            derm ? `VISUAL OBSERVATION:\n${derm.visual_summary}\n\nEXTENT & INVOLVEMENT:\n${derm.extent_affected}` : '',
            histology ? `\nCONDITION OVERVIEW (${histology.icd10}):\n${histology.description}` : '',
            symptoms.length > 0 ? `\nSYMPTOMS & SIGNS:\n${symptoms.map((s) => `- ${s}`).join('\n')}` : '',
            treatments.length > 0
                ? `\nCARE & MANAGEMENT:\n${treatments.map((t) => `- ${t.method} [${t.modality}]: ${t.details}`).join('\n')}`
                : '',
            interventions.length > 0
                ? `\nRECOMMENDED NEXT STEPS:\n${interventions.map((i) => `- [${i.urgency}] ${i.name}`).join('\n')}`
                : '',
            '\nDisclaimer: AI-assisted screening summary for informational and clinical triage support only.'
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
        <div className="max-w-5xl w-full mx-auto flex flex-col gap-4 sm:gap-5 select-text pb-8 print:max-w-none print:p-0 print:gap-4">
            {/* Top Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 backdrop-blur-2xl px-5 py-3 rounded-[24px] border border-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.03)] print:hidden">
                <button
                    type="button"
                    onClick={onBackToAnalyze}
                    className="px-4 py-2 rounded-full bg-stone-200/70 hover:bg-stone-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Scanner
                </button>

                <div className="flex items-center gap-2.5">
                    {!vlmReport && (
                        <button
                            type="button"
                            onClick={onGenerateReport}
                            disabled={isVlmLoading}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#e4765d] to-[#eb866f] text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-60"
                        >
                            {isVlmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isVlmLoading ? 'Generating VLM Details...' : 'Generate Full VLM Report'}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleCopySummary}
                        className="px-4 py-2 rounded-full bg-stone-200/70 hover:bg-stone-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Copied Summary' : 'Copy Text'}
                    </button>

                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Print / Save PDF
                    </button>
                </div>
            </div>

            {/* Main Printable Document Sheet */}
            <article className="bg-white/95 backdrop-blur-2xl rounded-[32px] p-6 sm:p-9 border border-white shadow-[0_16px_50px_rgba(0,0,0,0.04)] flex flex-col gap-6 print:shadow-none print:border-stone-300 print:rounded-none print:p-4">
                {/* Document Header */}
                <div className="flex flex-wrap justify-between items-start gap-4 border-b border-stone-200 pb-5">
                    <div>
                        <div className="flex items-center gap-2 text-[#e4765d] text-xs font-bold uppercase tracking-wider mb-1">
                            <Stethoscope className="w-4 h-4" />
                            <span>Cutaneous Assessment & Triage Brief</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                            {topPrediction.className}
                        </h1>
                        <p className="text-xs text-slate-500 mt-1">
                            Assessed by <strong className="text-slate-700">Dr. Bharath</strong> • Location: <strong className="text-slate-700">{patientContext.bodyLocation}</strong> • Duration: <strong className="text-slate-700">{patientContext.duration}</strong>
                        </p>
                        {patientContext.symptoms.length > 0 && (
                            <p className="text-xs text-[#c8452e] font-medium mt-1">
                                Reported Symptoms: {patientContext.symptoms.join(' • ')}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col sm:items-end gap-1.5 text-xs">
                        <span className="font-mono font-bold text-slate-700 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                            ID: {reportMeta.sessionCode}
                        </span>
                        <span className="text-slate-500">
                            {reportMeta.dateStr} at {reportMeta.timeStr}
                        </span>
                        <div className="mt-1">
                            {isHighRisk || derm?.severity_level === 'HIGH' || derm?.severity_level === 'ELEVATED' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[11px]">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    ATTENTION LEVEL: {derm?.severity_level || 'ELEVATED'}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    ATTENTION LEVEL: {derm?.severity_level || 'LOW'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 1: Visual Imaging Evidence + Classifier Differentials & Biometrics */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 break-inside-avoid">
                    <div className="md:col-span-7 bg-stone-50 rounded-[24px] p-4 border border-stone-200/80 flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Dermoscopic & XAI Localization Evidence
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                                Active Saliency Area: <strong className="text-slate-800">{calculatedAreaRatio}%</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <div className="aspect-square rounded-2xl overflow-hidden bg-stone-900 border border-stone-200">
                                    <img src={rawSnapshot} alt="Captured Skin Lesion" className="w-full h-full object-contain" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 text-center">
                                    1. Optical Capture (224×224)
                                </span>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <div className="aspect-square rounded-2xl overflow-hidden bg-stone-900 border border-stone-200">
                                    <img
                                        src={isoContourImage || rawSnapshot}
                                        alt="Topological Iso-Contour Map"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-500 text-center">
                                    2. Iso-Contour Saliency Overlay
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="md:col-span-5 bg-stone-50 rounded-[24px] p-4 border border-stone-200/80 flex flex-col justify-between gap-4">
                        <div>
                            <div className="flex justify-between items-center mb-2.5">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Top-5 Model Differentials
                                </span>
                                <span className="text-xs font-black text-[#e4765d]">{confidenceScore}% Top Match</span>
                            </div>
                            <div className="space-y-2">
                                {(topPredictions || []).slice(0, 5).map((pred, idx) => {
                                    const pct = Math.round(pred.probability * 100);
                                    return (
                                        <div key={idx} className="text-xs">
                                            <div className="flex justify-between mb-0.5">
                                                <span className={`truncate pr-2 ${idx === 0 ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
                                                    {idx + 1}. {pred.className}
                                                </span>
                                                <span className="font-mono font-semibold text-slate-700">{pct}%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${idx === 0 ? 'bg-[#e4765d]' : 'bg-slate-400'}`}
                                                    style={{ width: `${Math.max(pct, 3)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="border-t border-stone-200 pt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-stone-200/70">
                                <span className="text-[10px] text-slate-400 font-semibold block">OPTICAL ERYTHEMA INDEX</span>
                                <span className="font-mono font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                                    <Activity className="w-3.5 h-3.5 text-[#e4765d]" /> +{erythemaIndex}%
                                </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-stone-200/70">
                                <span className="text-[10px] text-slate-400 font-semibold block">FITZPATRICK TYPE</span>
                                <span className="font-bold text-slate-800 block mt-0.5">
                                    {skinTypePrediction ? `Type ${FITZPATRICK_LABELS[skinTypePrediction - 1]}` : 'Unverified'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Clinical ABCD Checklist Strip */}
                <div className="bg-stone-50 rounded-[20px] p-4 border border-stone-200/80 break-inside-avoid">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2.5">
                        Morphological ABCD Screening Indicators
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {abcdData.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white p-2.5 rounded-xl border border-stone-200/70 flex items-center justify-between text-xs"
                            >
                                <div>
                                    <span className="text-[10px] text-slate-400 block">{item.label.replace(':', '')}</span>
                                    <span className={`font-mono font-bold text-[11px] ${item.checked ? 'text-[#e4765d]' : 'text-slate-700'}`}>
                                        {item.value}
                                    </span>
                                </div>
                                {item.checked ? (
                                    <CheckSquare className="w-4 h-4 text-[#e4765d] shrink-0" />
                                ) : (
                                    <Square className="w-4 h-4 text-stone-300 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 3: VLM Clinical & Plain-English Report Sections */}
                {vlmError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                        {vlmError}
                    </div>
                )}

                {vlmReport ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-stone-50 rounded-[24px] p-5 border border-stone-200/80 flex flex-col gap-3 break-inside-avoid">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                                <Microscope className="w-4 h-4 text-[#e4765d]" />
                                <span>Dermoscopic Visual Analysis</span>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{derm?.visual_summary}</p>
                            <div className="bg-white p-3 rounded-xl border border-stone-200/70 text-xs space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase block">Extent & Tissue Involvement</span>
                                <p className="text-slate-700 leading-relaxed">{derm?.extent_affected}</p>
                                {derm?.severity_rationale && (
                                    <p className="text-[11px] text-[#c8452e] font-medium pt-1">{derm.severity_rationale}</p>
                                )}
                            </div>
                            {derm?.other_findings && derm.other_findings.length > 0 && (
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Additional Visual Findings</span>
                                    <ul className="space-y-1 text-xs text-slate-700">
                                        {derm.other_findings.map((f, i) => (
                                            <li key={i} className="flex items-start gap-1.5">
                                                <span className="text-[#e4765d] font-bold">•</span>
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <div className="bg-stone-50 rounded-[24px] p-5 border border-stone-200/80 flex flex-col gap-3 break-inside-avoid">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                                    <FileText className="w-4 h-4 text-[#e4765d]" />
                                    <span>Condition Overview</span>
                                </div>
                                {histology?.icd10 && (
                                    <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-0.5 rounded-full border border-stone-200 text-slate-600">
                                        {histology.icd10}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed">{histology?.description}</p>

                            <div className="border-t border-stone-200 pt-3">
                                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs uppercase tracking-wider mb-2">
                                    <AlertCircle className="w-3.5 h-3.5 text-[#e4765d]" />
                                    <span>Clinical Symptoms & Signs</span>
                                </div>
                                <ul className="space-y-1.5 text-xs text-slate-700">
                                    {symptoms.map((sym, idx) => (
                                        <li key={idx} className="bg-white px-3 py-2 rounded-xl border border-stone-200/70 leading-snug">
                                            {sym}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-stone-50 rounded-[24px] p-5 border border-stone-200/80 flex flex-col gap-3 break-inside-avoid">
                            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider">
                                <Pill className="w-4 h-4 text-[#e4765d]" />
                                <span>Clinical Management & Recommended Next Steps</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {treatments.map((tx, idx) => (
                                    <div key={idx} className="bg-white p-3.5 rounded-2xl border border-stone-200/80">
                                        <div className="flex justify-between items-center gap-2 mb-1">
                                            <span className="text-xs font-bold text-slate-800">{tx.method}</span>
                                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#e4765d]/10 text-[#c8452e]">
                                                {tx.modality}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{tx.details}</p>
                                    </div>
                                ))}
                            </div>

                            {interventions.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                                    {interventions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-white px-3 py-2.5 rounded-xl border border-stone-200/80 flex items-center justify-between gap-2 text-xs"
                                        >
                                            <span className="font-semibold text-slate-700 leading-snug">{item.name}</span>
                                            <span
                                                className={`px-2 py-0.5 rounded text-[9px] font-bold shrink-0 ${item.urgency === 'IMMEDIATE'
                                                    ? 'bg-rose-100 text-rose-700'
                                                    : item.urgency === 'SHORT_TERM'
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-stone-100 text-slate-600'
                                                    }`}
                                            >
                                                {item.urgency}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="bg-stone-50 rounded-[24px] p-6 border border-dashed border-stone-300 text-center flex flex-col items-center gap-2.5 print:hidden">
                        <p className="text-xs text-slate-500">
                            Detailed VLM visual observations, symptoms, and care recommendations have not been generated for this scan yet.
                        </p>
                        <button
                            type="button"
                            onClick={onGenerateReport}
                            disabled={isVlmLoading}
                            className="px-5 py-2.5 rounded-full bg-[#e4765d] text-white text-xs font-bold hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            {isVlmLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            {isVlmLoading ? 'Generating VLM Analysis...' : 'Generate Detailed VLM Section'}
                        </button>
                    </div>
                )}

                <footer className="border-t border-stone-200 pt-4 text-[11px] text-slate-400 flex flex-wrap justify-between items-center gap-2">
                    <span>
                        <strong>Clinical Decision-Support Notice:</strong> Generated for preliminary screening and educational triage. Always confirm findings via in-person dermatological examination.
                    </span>
                    <span className="font-mono">Saakura Dermoscopy AI</span>
                </footer>
            </article>
        </div>
    );
}