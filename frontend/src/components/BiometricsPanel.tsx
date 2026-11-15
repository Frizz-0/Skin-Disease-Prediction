import { useMemo } from 'react';
import { Info, Activity, CheckSquare, Square, MapPin, Clock } from 'lucide-react';
import {
    FITZPATRICK_LABELS,
    BODY_LOCATIONS,
    LESION_DURATIONS,
    PATIENT_SYMPTOM_OPTIONS
} from '../types/clinical';
import type { ClinicalIntervention, PatientContext } from '../types/clinical';

interface BiometricsPanelProps {
    topPredictions: Array<{ className: string; probability: number }> | null;
    erythemaIndex: number;
    skinTypePrediction: number | null;
    abcdData: Array<{ label: string; value: string; checked: boolean }>;
    patientContext: PatientContext;
    onPatientContextChange: (updated: PatientContext) => void;
    interventions?: ClinicalIntervention[];
    isVlmLoading?: boolean;
}

export default function BiometricsPanel({
    topPredictions,
    erythemaIndex,
    skinTypePrediction,
    abcdData,
    patientContext,
    onPatientContextChange,
    interventions = [],
    isVlmLoading = false
}: BiometricsPanelProps) {
    const radarMetrics = useMemo(() => {
        const DEFAULT_PREDICTIONS = [
            { className: 'Melanoma', probability: 0.94 },
            { className: 'Dysplastic Nevus', probability: 0.18 },
            { className: 'Seborrheic Kerat.', probability: 0.05 },
            { className: 'Basal Cell Carc.', probability: 0.02 },
            { className: 'Dermatofibroma', probability: 0.01 }
        ];

        const items = Array.from({ length: 5 }, (_, i) => {
            if (topPredictions && topPredictions[i]) {
                return {
                    className: topPredictions[i].className,
                    probability: topPredictions[i].probability
                };
            }
            return DEFAULT_PREDICTIONS[i];
        });

        const points = items
            .map((item, idx) => {
                const angle = idx * ((2 * Math.PI) / 5) - Math.PI / 2;
                const r = Math.max(item.probability, 0.12) * 38;
                const x = (50 + r * Math.cos(angle)).toFixed(1);
                const y = (50 + r * Math.sin(angle)).toFixed(1);
                return `${x},${y}`;
            })
            .join(' ');

        return { points, items };
    }, [topPredictions]);

    const toggleSymptom = (symptom: string) => {
        const exists = patientContext.symptoms.includes(symptom);
        const updatedSymptoms = exists
            ? patientContext.symptoms.filter((s) => s !== symptom)
            : [...patientContext.symptoms, symptom];
        onPatientContextChange({ ...patientContext, symptoms: updatedSymptoms });
    };

    return (
        <section className="col-span-12 md:col-span-6 lg:col-span-3 flex flex-col gap-3.5 sm:gap-5">
            {/* 5-Axis Spider Radar & Optical Biometrics Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-4 sm:p-5 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col gap-3.5">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-800">Analysis & Biometrics</span>
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>

                <div className="relative w-full aspect-square flex items-center justify-center p-2">
                    <svg className="w-full h-full max-w-[210px]" viewBox="0 0 100 100">
                        <polygon points="50,12 86,38 72,80 28,80 14,38" fill="#faf8f4" stroke="#e0dbd1" strokeWidth="0.8" />
                        <polygon points="50,24 75,42 65,71 35,71 25,42" fill="none" stroke="#e0dbd1" strokeWidth="0.6" strokeDasharray="2,2" />
                        <polygon points="50,36 64,46 59,62 41,62 36,46" fill="none" stroke="#e0dbd1" strokeWidth="0.6" />

                        <line x1="50" y1="50" x2="50" y2="12" stroke="#d5cfc2" strokeWidth="0.8" />
                        <line x1="50" y1="50" x2="86" y2="38" stroke="#d5cfc2" strokeWidth="0.8" />
                        <line x1="50" y1="50" x2="72" y2="80" stroke="#d5cfc2" strokeWidth="0.8" />
                        <line x1="50" y1="50" x2="28" y2="80" stroke="#d5cfc2" strokeWidth="0.8" />
                        <line x1="50" y1="50" x2="14" y2="38" stroke="#d5cfc2" strokeWidth="0.8" />

                        <polygon
                            points={radarMetrics.points}
                            fill="#e4765d"
                            fillOpacity="0.25"
                            stroke="#e4765d"
                            strokeWidth="2"
                            className="transition-all duration-700 ease-out filter drop-shadow-[0_2px_8px_rgba(228,118,93,0.3)]"
                        />

                        {radarMetrics.points.split(' ').map((pt, idx) => {
                            const [cx, cy] = pt.split(',');
                            return <circle key={idx} cx={cx} cy={cy} r="2.4" fill="#e4765d" />;
                        })}
                    </svg>

                    <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[9px] text-center font-bold text-slate-600 leading-tight">
                        <span className="block max-w-[80px] truncate">{radarMetrics.items[0].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[0].probability * 100)}%</span>
                    </div>

                    <div className="absolute top-1/4 right-0 text-[9px] text-right font-bold text-slate-600 leading-tight">
                        <span className="block max-w-[70px] truncate">{radarMetrics.items[1].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[1].probability * 100)}%</span>
                    </div>

                    <div className="absolute bottom-1 right-2 text-[9px] text-right font-bold text-slate-600 leading-tight">
                        <span className="block max-w-[70px] truncate">{radarMetrics.items[2].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[2].probability * 100)}%</span>
                    </div>

                    <div className="absolute bottom-1 left-2 text-[9px] text-left font-bold text-slate-600 leading-tight">
                        <span className="block max-w-[70px] truncate">{radarMetrics.items[3].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[3].probability * 100)}%</span>
                    </div>

                    <div className="absolute top-1/4 left-0 text-[9px] text-left font-bold text-slate-600 leading-tight">
                        <span className="block max-w-[70px] truncate">{radarMetrics.items[4].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[4].probability * 100)}%</span>
                    </div>
                </div>

                {/* True RGB Hemoglobin / Redness Concentration Metric */}
                <div className="flex justify-between items-center bg-stone-100/80 p-3 rounded-[18px] border border-stone-200/60 text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#e4765d]" /> Optical Erythema Index:
                    </span>
                    <span className={`font-mono font-bold ${erythemaIndex > 18 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        +{erythemaIndex}%
                    </span>
                </div>

                <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-2">
                        <span>Fitzpatrick Scale Photobiology</span>
                        <span className="text-[10px] text-slate-500 font-normal">Fairness Calibration</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                        {FITZPATRICK_LABELS.map((type, idx) => {
                            const isConfirmed = skinTypePrediction === idx + 1;
                            return (
                                <div
                                    key={type}
                                    className={`flex flex-col items-center justify-center py-2 rounded-2xl text-[10px] font-bold transition-all border ${isConfirmed
                                        ? 'bg-[#c58d6e] border-[#b0785a] text-white shadow-xs scale-105 z-10'
                                        : 'bg-stone-100/70 border-stone-200/60 text-slate-400'
                                        }`}
                                >
                                    <span>{type}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-[9px] text-slate-400 text-center mt-2 font-medium">
                        {skinTypePrediction ? `Type ${skinTypePrediction} Baseline Active for Bias Minimization` : 'Sensing Cutaneous Phototype...'}
                    </div>
                </div>
            </div>

            {/* Clinical ABCD Checklist + Patient Context + Recommended Interventions */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-4 sm:p-5 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)] transition-all duration-300 flex-1 flex flex-col justify-between gap-4">
                {/* 1. ABCD Morphological Checklist */}
                <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-800 mb-2.5 border-b border-stone-100 pb-2">
                        Clinical ABCD Checklist
                    </h3>
                    <div className="space-y-2">
                        {abcdData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                <span className="text-slate-500 font-medium">{item.label}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className={`font-bold font-mono text-[11px] ${item.checked ? 'text-[#e4765d]' : 'text-slate-400'}`}>
                                        {item.value}
                                    </span>
                                    {item.checked ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-[#e4765d]" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-stone-300" />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Interactive Patient Symptom & History Check (Feeds VLM Context) */}
                <div className="border-t border-stone-100 pt-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Patient Context & Symptoms</span>
                        <span className="text-[9px] font-semibold text-[#e4765d] bg-[#e4765d]/10 px-2 py-0.5 rounded-full">
                            Feeds AI Report
                        </span>
                    </div>

                    {/* Body Location Selector */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Body Location
                        </span>
                        <div className="flex flex-wrap gap-1 text-[14px]">
                            {BODY_LOCATIONS.map((loc) => {
                                const active = patientContext.bodyLocation === loc;
                                return (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => onPatientContextChange({ ...patientContext, bodyLocation: loc })}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${active
                                            ? 'bg-[#e4765d] text-white shadow-xs'
                                            : 'bg-stone-100 text-slate-600 hover:bg-stone-200/70'
                                            }`}
                                    >
                                        {loc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Duration Selector */}
                    <div className="flex flex-col gap-3 text-[14px]">
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Duration
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                            {LESION_DURATIONS.map((dur) => {
                                const active = patientContext.duration === dur;
                                return (
                                    <button
                                        key={dur}
                                        type="button"
                                        onClick={() => onPatientContextChange({ ...patientContext, duration: dur })}
                                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all text-center ${active
                                            ? 'bg-[#c58d6e] text-white shadow-xs'
                                            : 'bg-stone-100 text-slate-600 hover:bg-stone-200/70'
                                            }`}
                                    >
                                        {dur}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Physical Symptom Toggles */}
                    <div className="flex flex-col gap-1 text-[14px]">
                        <span className="text-[10px] font-semibold text-slate-400">Physical Sensations / Changes</span>
                        <div className="grid grid-cols-2 gap-1.5">
                            {PATIENT_SYMPTOM_OPTIONS.map((sym) => {
                                const active = patientContext.symptoms.includes(sym);
                                return (
                                    <button
                                        key={sym}
                                        type="button"
                                        onClick={() => toggleSymptom(sym)}
                                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-semibold border transition-all text-left flex items-center justify-between ${active
                                            ? 'bg-[#e4765d]/12 border-[#e4765d] text-[#c8452e]'
                                            : 'bg-stone-50 border-stone-200/70 text-slate-600 hover:bg-stone-100'
                                            }`}
                                    >
                                        <span className="truncate">{sym}</span>
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ml-1 ${active ? 'bg-[#e4765d]' : 'bg-stone-300'}`} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 3. Recommended Interventions */}
                <div className="border-t border-stone-100 pt-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700">Recommended Interventions</span>
                        {isVlmLoading && <span className="text-[9px] text-[#e4765d] font-bold animate-pulse">UPDATING...</span>}
                    </div>
                    <div className="space-y-1.5">
                        {interventions.length > 0 ? (
                            interventions.map((rec, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 rounded-[14px] bg-stone-100/80 border border-stone-200/50 text-[10px] gap-2">
                                    <span className="font-semibold text-slate-700 truncate">{rec.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                            className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${rec.urgency === 'IMMEDIATE'
                                                ? 'bg-rose-100 text-rose-700'
                                                : rec.urgency === 'SHORT_TERM'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-stone-200/80 text-slate-600'
                                                }`}
                                        >
                                            {rec.urgency}
                                        </span>
                                        <span className="font-mono text-slate-400">{rec.code}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-2.5 rounded-[14px] bg-stone-100/60 border border-stone-200/40 text-[10px] text-slate-400 italic text-center">
                                Data will be visible once the report is generated
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}