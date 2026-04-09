"use client";
import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanSearch, ShieldCheck } from "lucide-react";

const CameraView = forwardRef<HTMLVideoElement, any>(({ onCapture, isScanning }, ref) => {
  const [isCameraActive, setIsCameraActive] = useState(false);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (ref && "current" in ref && ref.current) {
        ref.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="relative w-full aspect-square max-w-[450px] group">
        
        {/* 1. Outer HUD Decoration */}
        <div className="absolute -inset-4 border border-cyan-500/10 rounded-[40px] pointer-events-none" />
        <div className="absolute -inset-1 border border-zinc-800 rounded-[32px] pointer-events-none" />

        {/* 2. Main Camera Container */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden bg-zinc-900 border-2 border-zinc-800 shadow-2xl">
          <video 
            ref={ref} 
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover transition-opacity duration-700 ${!isCameraActive ? 'opacity-0' : 'opacity-100'}`} 
          />

          {/* 3. The Scanning Overlay (Laser + Matrix) */}
          <AnimatePresence>
            {isScanning && (
              <>
                {/* Horizontal Laser Line */}
                <motion.div 
                  initial={{ top: "-5%" }}
                  animate={{ top: "105%" }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-cyan-400 shadow-[0_0_20px_rgba(34,211,238,1)] z-30"
                />
                {/* Digital "Noise" Overlay */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 z-20 pointer-events-none"
                />
                {/* Blue Tint Tint */}
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-cyan-900/30 z-10"
                />
              </>
            )}
          </AnimatePresence>

          {/* Offline Placeholder */}
          {!isCameraActive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-700 bg-zinc-900">
               <Camera className="w-12 h-12 mb-3 opacity-10" />
               <p className="text-[10px] font-mono uppercase tracking-[0.3em]">System Offline</p>
            </div>
          )}
        </div>

{/* Professional Guidance Overlay */}
<div className="absolute bottom-6 left-0 right-0 flex justify-center z-40 pointer-events-none">
  <AnimatePresence mode="wait">
    {!isCameraActive ? (
      <motion.p 
        key="init"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-[10px] font-mono text-cyan-500/80 uppercase tracking-[0.2em] bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-cyan-500/20"
      >
        Awaiting Sensor Initialization
      </motion.p>
    ) : !isScanning && (
      <motion.p 
        key="ready"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em] bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
      >
        Align Target within HUD 
      </motion.p>
    )}
  </AnimatePresence>
</div>

        {/* Corners (Styled for Modern HUD) */}
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-cyan-500/50 rounded-br-3xl" />
      </div>

      {/* Buttons */}
      <div className="flex gap-4 w-full max-w-[400px]">
        <button onClick={startCamera} className="flex-1 py-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 rounded-2xl text-[10px] font-mono uppercase tracking-widest transition-all">
          Initialize
        </button>
        <button 
          disabled={isScanning || !isCameraActive}
          onClick={onCapture} 
          className="flex-[2] py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-2xl text-[10px] font-mono font-bold uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
        >
          {isScanning ? "Processing..." : <><ScanSearch className="w-4 h-4" /> Start Diagnosis</>}
        </button>
      </div>
    </div>
  );
});

CameraView.displayName = "CameraView";
export default CameraView;