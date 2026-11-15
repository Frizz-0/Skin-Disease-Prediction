import { Sparkles, Upload, Printer, ChevronDown } from 'lucide-react';

interface HeaderProps {
    activeTab: 'Analyze' | 'History' | 'Report';
    onTabChange: (tab: 'Analyze' | 'History' | 'Report') => void;
    onUploadClick: () => void;
    onPrintClick: () => void;
}

export default function Header({ activeTab, onTabChange, onUploadClick, onPrintClick }: HeaderProps) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-3 bg-white/70 backdrop-blur-2xl px-4 py-2.5 sm:px-6 sm:py-3 rounded-[24px] border border-white/90 shadow-[0_6px_30px_rgba(0,0,0,0.03)] transition-all hover:bg-white/80 print:hidden">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#eb6a4f] via-[#e4765d] to-[#f6a28e] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(228,118,93,0.35)]">
                    <Sparkles className="w-4 h-4" />
                </div>
                <div>
                    <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-800 flex items-center gap-1.5">
                        Skin Disease Prediction
                    </h1>
                </div>
            </div>

            <div className="flex text-[14px] bg-stone-200/60 p-1 rounded-full border border-stone-200/50 shadow-inner items-center">
                {(['Analyze', 'History', 'Report'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => onTabChange(tab)}
                        className={`px-4 sm:px-5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${activeTab === tab
                                ? 'bg-white text-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.06)] scale-[1.02]'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="flex items-center bg-stone-200/50 border border-stone-200/60 rounded-full p-0.5">
                    <button
                        onClick={onUploadClick}
                        title="Upload Dermoscopy"
                        className="p-1.5 sm:px-3 text-xs font-semibold text-slate-600 hover:bg-white rounded-full transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden lg:inline">Upload</span>
                    </button>
                    <button
                        onClick={onPrintClick}
                        title="Print Clinical Report"
                        className="p-1.5 sm:px-3 text-xs font-semibold text-slate-600 hover:bg-white rounded-full transition-all flex items-center gap-1.5 active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden lg:inline">Print</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 bg-stone-200/50 border border-stone-200/60 pl-1 pr-3 py-1 rounded-full">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#e4765d] to-[#f4a08b] flex items-center justify-center text-[10px] font-bold text-white shadow-xs">
                        BM
                    </div>
                    <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Dr. Bharath</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                </div>
            </div>
        </header>
    );
}