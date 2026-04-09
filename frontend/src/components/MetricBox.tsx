"use client";
import { motion } from "framer-motion";

interface MetricBoxProps {
  label: string;
  value: string;
  isWarning?: boolean;
}

export default function MetricBox({ label, value, isWarning }: MetricBoxProps) {
  return (
    <div className="group relative flex flex-col gap-1.5 p-4 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl transition-all duration-300 hover:border-cyan-500/40 hover:bg-zinc-900/60 overflow-hidden">
      
      {/* 1. Status Indicator Bar (Medical Dashboard Style) */}
      <div className={`absolute left-0 top-0 bottom-0 w-0.5 transition-colors duration-300 ${
        isWarning ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-cyan-500/30 group-hover:bg-cyan-500"
      }`} />

      {/* 2. Refined Scanline Animation */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity duration-700 bg-[linear-gradient(transparent_50%,rgba(34,211,238,0.05)_50%)] bg-[length:100%_4px] animate-scan" />
      
      {/* 3. Label: Smaller, tracking-widest for that 'Technical' feel */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-zinc-500 uppercase font-mono tracking-[0.25em] font-semibold">
          {label}
        </p>
        {isWarning && (
          <motion.div 
            animate={{ opacity: [0.4, 1, 0.4] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-1.5 h-1.5 rounded-full bg-amber-500" 
          />
        )}
      </div>
      
      {/* 4. Value: Large, clear, monospaced */}
      <p className={`text-sm font-bold tracking-tight font-mono ${
        isWarning ? "text-amber-500" : "text-zinc-100 group-hover:text-cyan-400"
      } transition-colors duration-300`}>
        {value}
      </p>

      {/* 5. Subtle Bottom Glow */}
      <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
}