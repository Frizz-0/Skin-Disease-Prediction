import { useMemo } from 'react';
import {
    Info,
    Activity,
    MapPin,
    Clock,
    Flame,
    Zap,
    Droplets,
    TrendingUp,
    User
} from 'lucide-react';
import {
    FITZPATRICK_LABELS,
    BODY_LOCATIONS,
    LESION_DURATIONS,
    PATIENT_SYMPTOM_OPTIONS,
    GENDER_OPTIONS
} from '../types/clinical';
import type { ClinicalIntervention, PatientContext } from '../types/clinical';

interface BiometricsPanelProps {
    topPredictions: Array<{ className: string; probability: number }> | null;
    erythemaIndex: number;
    skinTypePrediction: number | null;
    patientContext: PatientContext;
    onPatientContextChange: (updated: PatientContext) => void;
    interventions?: ClinicalIntervention[];
    isVlmLoading?: boolean;
}

const SYMPTOM_META: Record<string, { icon: typeof Flame; sub: string }> = {
    'Itchy': { icon: Flame, sub: 'Pruritus / irritation' },
    'Tender / Pain': { icon: Zap, sub: 'Sore to touch' },
    'Bleeding / Ooze': { icon: Droplets, sub: 'Crusting or fluid' },
    'Changing Size': { icon: TrendingUp, sub: 'Shape or shade shift' },
};

export default function BiometricsPanel({
    topPredictions,
    erythemaIndex,
    skinTypePrediction,
    patientContext,
    onPatientContextChange,
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
        <section className="col-span-12 md:col-span-6 lg:col-span-3 min-w-0 flex flex-col gap-3.5 sm:gap-5">
            {/* 5-Axis Spider Radar & Optical Biometrics Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-4 sm:p-5 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)] transition-all duration-300 flex flex-col gap-3.5">
                <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
                    <h2 className="text-sm font-bold text-slate-800 tracking-tight">Analysis & Biometrics</h2>
                    <Info className="w-4 h-4 text-slate-400" />
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

                    <div className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[11px] text-center font-semibold text-slate-600 leading-tight">
                        <span className="block max-w-[85px] truncate">{radarMetrics.items[0].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[0].probability * 100)}%</span>
                    </div>

                    <div className="absolute top-1/4 right-0 text-[11px] text-right font-semibold text-slate-600 leading-tight">
                        <span className="block max-w-[75px] truncate">{radarMetrics.items[1].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[1].probability * 100)}%</span>
                    </div>

                    <div className="absolute bottom-1 right-2 text-[11px] text-right font-semibold text-slate-600 leading-tight">
                        <span className="block max-w-[75px] truncate">{radarMetrics.items[2].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[2].probability * 100)}%</span>
                    </div>

                    <div className="absolute bottom-1 left-2 text-[11px] text-left font-semibold text-slate-600 leading-tight">
                        <span className="block max-w-[75px] truncate">{radarMetrics.items[3].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[3].probability * 100)}%</span>
                    </div>

                    <div className="absolute top-1/4 left-0 text-[11px] text-left font-semibold text-slate-600 leading-tight">
                        <span className="block max-w-[75px] truncate">{radarMetrics.items[4].className}</span>
                        <span className="text-[#e4765d] font-mono">{Math.round(radarMetrics.items[4].probability * 100)}%</span>
                    </div>
                </div>

                <div className="flex justify-between items-center bg-stone-100/80 p-3 rounded-[18px] border border-stone-200/60 text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#e4765d]" /> Optical Erythema Index
                    </span>
                    <span className={`font-mono font-bold ${erythemaIndex > 18 ? 'text-rose-500' : 'text-emerald-600'}`}>
                        +{erythemaIndex}%
                    </span>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-semibold text-slate-700">Fitzpatrick Scale Photobiology</span>
                        <span className="text-[11px] text-slate-400 font-medium">Fairness Calibration</span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5">
                        {FITZPATRICK_LABELS.map((type, idx) => {
                            const isConfirmed = skinTypePrediction === idx + 1;
                            return (
                                <div
                                    key={type}
                                    className={`flex flex-col items-center justify-center py-2 rounded-2xl text-xs font-bold transition-all border ${isConfirmed
                                        ? 'bg-[#c58d6e] border-[#b0785a] text-white shadow-xs scale-105 z-10'
                                        : 'bg-stone-100/70 border-stone-200/60 text-slate-400'
                                        }`}
                                >
                                    <span>{type}</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                        {skinTypePrediction ? `Type ${skinTypePrediction} Baseline Active for Bias Minimization` : 'Sensing Cutaneous Phototype...'}
                    </p>
                </div>
            </div>

            {/* Patient Context & Demographics Card */}
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] p-4 sm:p-5 border border-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_16px_50px_rgba(0,0,0,0.06)] transition-all duration-300 flex-1 flex flex-col justify-between gap-3.5">
                <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                        <h2 className="text-sm font-bold text-slate-800 tracking-tight">Patient Context</h2>
                        <span className="text-[11px] font-semibold text-[#e4765d] bg-[#e4765d]/10 px-2.5 py-0.5 rounded-full">
                            VLM Context
                        </span>
                    </div>

                    {/* Anatomical Location Chips */}
                    <div className="bg-stone-50/90 p-3 rounded-2xl border border-stone-200/60 flex flex-col gap-2">
                        <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#e4765d]" /> Affected Location
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[14px]">
                            {BODY_LOCATIONS.map((loc) => {
                                const active = patientContext.bodyLocation === loc;
                                return (
                                    <button
                                        key={loc}
                                        type="button"
                                        onClick={() => onPatientContextChange({ ...patientContext, bodyLocation: loc })}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 ${active
                                            ? 'bg-[#e4765d] text-white shadow-[0_2px_8px_rgba(228,118,93,0.3)]'
                                            : 'bg-white text-slate-600 border border-stone-200/80 hover:border-[#e4765d]/40'
                                            }`}
                                    >
                                        {loc}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Segmented Timeline Track */}
                    <div className="bg-stone-50/90 p-3 rounded-2xl border border-stone-200/60 flex flex-col gap-2">
                        <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#e4765d]" /> Duration
                        </span>
                        <div className="grid grid-cols-4 bg-stone-200/70 p-1 rounded-xl gap-0.5 text-[14px]">
                            {LESION_DURATIONS.map((dur) => {
                                const active = patientContext.duration === dur;
                                return (
                                    <button
                                        key={dur}
                                        type="button"
                                        onClick={() => onPatientContextChange({ ...patientContext, duration: dur })}
                                        className={`py-1.5 rounded-[10px] text-[11px] font-bold transition-all ${active
                                            ? 'bg-white text-[#e4765d] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {dur}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Tactile 2x2 Symptom Cards */}
                    <div className="flex flex-col gap-2">
                        <span className="text-[13px] font-semibold text-slate-600">Sensations & Visual Changes</span>
                        <div className="grid grid-cols-2 gap-2 ">
                            {PATIENT_SYMPTOM_OPTIONS.map((sym) => {
                                const active = patientContext.symptoms.includes(sym);
                                const meta = SYMPTOM_META[sym] || { icon: Flame, sub: '' };
                                const Icon = meta.icon;
                                return (
                                    <button
                                        key={sym}
                                        type="button"
                                        onClick={() => toggleSymptom(sym)}
                                        className={`p-2.5 rounded-2xl border transition-all text-left flex items-center gap-2.5 active:scale-[0.98] ${active
                                            ? 'bg-[#e4765d]/10 border-[#e4765d] shadow-2xs'
                                            : 'bg-stone-50/90 border-stone-200/70 hover:bg-white'
                                            }`}
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-[#e4765d] text-white' : 'bg-white text-slate-400 border border-stone-200/70'
                                                }`}
                                        >
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span
                                            className={`text-xs font-bold leading-snug ${active ? 'text-[#c8452e]' : 'text-slate-700'
                                                }`}
                                        >
                                            {sym}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Optional Patient Demographics & Specifics */}
                <div className="bg-stone-50/90 p-3 rounded-2xl border border-stone-200/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-slate-600 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#e4765d]" /> Patient Profile
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                    </div>

                    {/* Age + Gender Row */}
                    <div className="grid grid-cols-12 gap-1.5 text-[14px]">
                        <div className="col-span-4">
                            <input
                                type="number"
                                min={0}
                                max={120}
                                inputMode="numeric"
                                placeholder="Age"
                                value={patientContext.age || ''}
                                onChange={(e) =>
                                    onPatientContextChange({ ...patientContext, age: e.target.value })
                                }
                                className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-semibold text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:border-[#e4765d]"
                            />
                        </div>

                        <div className="col-span-8 grid grid-cols-3 bg-stone-200/70 p-0.5 rounded-xl gap-0.5 ">
                            {GENDER_OPTIONS.map((g) => {
                                const active = patientContext.gender === g;
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() =>
                                            onPatientContextChange({
                                                ...patientContext,
                                                gender: active ? '' : g,
                                            })
                                        }
                                        className={`py-1 rounded-[9px] text-[11px] font-bold transition-all ${active
                                            ? 'bg-white text-[#e4765d] shadow-2xs'
                                            : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {g}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Other Clinical Specifics */}
                    <input
                        type="text"
                        placeholder="Specifics (e.g., sun exposure, family history, meds)"
                        value={patientContext.clinicalNotes || ''}
                        onChange={(e) =>
                            onPatientContextChange({ ...patientContext, clinicalNotes: e.target.value })
                        }
                        className="w-full px-3 py-1.5 rounded-xl  bg-white border border-stone-200/80 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#e4765d]"
                    />
                </div>
            </div>
        </section>
    );
}