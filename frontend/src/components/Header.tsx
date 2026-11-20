import {
    Scan,
    FileText,
    Upload, Printer
} from 'lucide-react';

interface HeaderProps {
    activeTab: 'Analyze' | 'History' | 'Report';
    onTabChange: (tab: 'Analyze' | 'History' | 'Report') => void;
    onUploadClick: () => void;
    onPrintClick: () => void;
}

export default function Header({
    activeTab,
    onTabChange,
    onUploadClick,
    onPrintClick,
}: HeaderProps) {
    const isReport = activeTab === 'Report';

    return (
        <header className="bg-white/80 backdrop-blur-2xl rounded-[26px] sm:rounded-[30px] p-3 sm:px-5 sm:py-3 border border-white/90 shadow-[0_8px_30px_rgba(38,29,26,0.04)] print:hidden relative z-20">
            {/* Top Row: Brand Lockup + Desktop Nav + Compact Actions */}
            <div className="flex items-center justify-between gap-2.5">
                {/* Brand Identity (CUTIS DERM AI) */}
                <button
                    type="button"
                    onClick={() => onTabChange('Analyze')}
                    className="flex items-center gap-2.5 text-left group shrink-0 focus:outline-none"
                >
                    {/* <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#9e3924] via-[#c4563e] to-[#cfa06e] p-[1.5px] shadow-[0_4px_14px_rgba(184,76,53,0.28)] group-hover:scale-[1.03] transition-transform"> */}

                    <div className="w-9 h-9 sm:w-10 sm:h-10  group-hover:scale-[1.03] transition-transform">
                        <div className="w-full h-full  flex items-center justify-center">
                            {/* Minimalist Gold 'C' + Botanical Leaf Emblem */}
                            <img
                                src='Cutis_logo.png'
                                className="w-8 h-8">
                            </img>
                        </div>
                    </div>

                    <div className="leading-none">
                        <div className="flex items-center gap-1.5">
                            <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-800">
                                CUTIS
                            </span>
                            <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase px-1.5 py-0.5 rounded-md bg-[#cfa06e]/20 text-[#9c6b3b] border border-[#cfa06e]/30">
                                DERM AI
                            </span>
                        </div>
                        <p className="hidden sm:block text-[11px] text-slate-400 font-medium mt-1">
                            Skin Disease Prediction
                        </p>
                    </div>
                </button>

                {/* Center Segmented Switcher (Desktop & Tablet md+) */}
                <nav
                    aria-label="Primary Workspace"
                    className="hidden md:flex items-center bg-stone-100/90 p-1 rounded-full border border-stone-200/70"
                >
                    <button
                        type="button"
                        onClick={() => onTabChange('Analyze')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${!isReport
                            ? 'bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white shadow-[0_3px_12px_rgba(184,76,53,0.28)]'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <Scan className="w-3.5 h-3.5" />
                        <span>Scanner</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => onTabChange('Report')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all ${isReport
                            ? 'bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white shadow-[0_3px_12px_rgba(184,76,53,0.28)]'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Clinical Report</span>
                    </button>
                </nav>

                {/* Right Action Buttons (Compact on Mobile, Expanded on Desktop) */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onUploadClick}
                        className="px-3 sm:px-3.5 py-2 rounded-full bg-stone-100 hover:bg-stone-200/80 text-slate-700 border border-stone-200/80 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all active:scale-95"
                    >
                        <Upload className="w-3.5 h-3.5 text-[#b84c35] shrink-0" />
                        <span>Upload</span>
                        <span className="hidden lg:inline">Image</span>
                    </button>

                    <button
                        type="button"
                        onClick={onPrintClick}
                        className="px-3 sm:px-3.5 py-2 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shadow-xs transition-all active:scale-95"
                    >
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                        <span className="sm:hidden">PDF</span>
                        <span className="hidden sm:inline">Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Bottom Row (Mobile Only < md): Full-Width Segmented Mode Switcher */}
            <nav
                aria-label="Mobile Workspace Switcher"
                className="grid grid-cols-2 gap-1.5 mt-2.5 pt-2.5 border-t border-stone-200/60 md:hidden"
            >
                <button
                    type="button"
                    onClick={() => onTabChange('Analyze')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${!isReport
                        ? 'bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white shadow-xs'
                        : 'bg-stone-100/80 text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scanner</span>
                </button>

                <button
                    type="button"
                    onClick={() => onTabChange('Report')}
                    className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${isReport
                        ? 'bg-gradient-to-r from-[#b84c35] to-[#e4765d] text-white shadow-xs'
                        : 'bg-stone-100/80 text-slate-600 hover:text-slate-800'
                        }`}
                >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Clinical Report</span>
                </button>
            </nav>
        </header>
    );
}