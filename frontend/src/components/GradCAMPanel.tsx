// components/GradCAMPanel.tsx
"use client";
import { BotMessageSquare } from "lucide-react";
import { motion } from "framer-motion";

export default function GradCAMPanel({ 
  gradCamImage, 
  isScanning 
}: { 
  gradCamImage: string | null; 
  isScanning: boolean 
}) {
  return (
    <div className="aspect-video bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 overflow-hidden relative group">
      {/* Background HUD Grid */}
      <div className="absolute inset-0 bg-size-[20px_20px] bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] pointer-events-none" />
      
      {gradCamImage ? (
        // Display Grad-CAM Heatmap
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-full h-full"
        >
          <img 
            src={gradCamImage} 
            alt="Grad-CAM Attention Heatmap" 
            className="w-full h-full object-contain rounded-2xl" 
          />
          <div className="absolute inset-0 rounded-2xl pointer-events-none border border-cyan-500/30" />
        </motion.div>
      ) : isScanning ? (
        // Scanning Animation
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full"
          />
          <p className="text-xs font-mono text-cyan-400 uppercase tracking-widest">Generating Attention Map...</p>
        </div>
      ) : (
        // Empty State
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <BotMessageSquare className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
          </motion.div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2">Grad-CAM Visualization</p>
          <p className="text-xs text-zinc-600 max-w-45">
            Model attention heatmap will appear here after diagnosis
          </p>
        </div>
      )}

      {/* HUD Badge */}
      <div className="absolute top-3 right-3 z-10">
        <motion.span 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 rounded font-mono text-xs text-cyan-400 uppercase"
        >
          XAI
        </motion.span>
      </div>
    </div>
  );
}