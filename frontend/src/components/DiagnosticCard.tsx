"use client";
import { motion } from "framer-motion";
import { ShieldCheck, AlertTriangle, Fingerprint } from "lucide-react";

interface Result {
  disease: string;
  confidence: number;
  skin_type: string;
  risk: "Low" | "Moderate" | "High";
}

export default function DiagnosticCard({ result, isScanning }: { result: Result | null; isScanning: boolean }) {
  return (
    <div className="relative group">
      {/* Glow Effect */}
      <div className="absolute -inset-0.5 bg-linear-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
      
      <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-cyan-500" /> Analysis Report
          </h3>
          {result && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
              result.risk === "Low" ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
            }`}>
              {result.risk} Risk
            </span>
          )}
        </div>

        {isScanning ? (
          <div className="py-12 flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <p className="text-xs font-mono text-cyan-500 animate-pulse">Processing Neural Layers...</p>
          </div>
        ) : result ? (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Classification</p>
              <h2 className="text-2xl font-mono text-white tracking-tight uppercase">{result.disease}</h2>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono uppercase">
                <span className="text-zinc-500">Confidence</span>
                <span className="text-cyan-400">{result.confidence}%</span>
              </div>
              <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence}%` }}
                  className="h-full bg-cyan-500"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Skin Type</p>
                <p className="text-xs text-zinc-300">{result.skin_type}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-zinc-500 uppercase">Status</p>
                <p className="text-xs text-emerald-400 flex items-center justify-end gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="py-20 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-zinc-700 mx-auto" />
            <p className="text-xs font-mono text-zinc-600">Waiting for bio-metric input scan...</p>
          </div>
        )}
      </div>
    </div>
  );
}