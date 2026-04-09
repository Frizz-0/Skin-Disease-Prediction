// components/TopPredictions.tsx
"use client";
import { motion } from "framer-motion";

export default function TopPredictions({ 
  topPredictions 
}: { 
  topPredictions?: Array<{ name: string; probability: number; index: number }> 
}) {
  // Default empty state
  if (!topPredictions || topPredictions.length === 0) {
    return (
      <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl min-h-75 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Diagnostic Confidence</p>
          <p className="text-zinc-600 text-sm mt-2">Run diagnosis to see predictions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl min-h-75 backdrop-blur-sm">
      <div className="flex justify-between items-end mb-6">
        <h3 className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Top Predictions</h3>
        <span className="text-xs text-zinc-500 font-mono">AI CONFIDENCE</span>
      </div>

      <div className="space-y-4">
        {topPredictions.map((pred, i) => (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={pred.index} 
            className="group"
          >
            {/* Disease Name & Percentage */}
            <div className="flex justify-between text-xs mb-1.5 font-mono">
              <span className="text-zinc-300 group-hover:text-cyan-300 transition-colors truncate pr-2">
                {pred.name}
              </span>
              <span className={`text-right ${i === 0 ? "text-cyan-400 font-bold" : "text-zinc-500"}`}>
                {(pred.probability * 100).toFixed(1)}%
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pred.probability * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 + i * 0.1 }}
                className={`h-full rounded-full ${
                  i === 0 ? "bg-linear-to-r from-cyan-500 to-cyan-400" : "bg-zinc-700"
                }`}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600 font-mono">
          <span className="text-cyan-500">{topPredictions.length}</span> predictions analyzed
        </p>
      </div>
    </div>
  );
}