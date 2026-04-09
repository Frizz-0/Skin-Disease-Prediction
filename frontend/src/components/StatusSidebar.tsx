import { motion } from "framer-motion";

interface StatusSidebarProps {
  modelStatus?: string;
  isScanning?: boolean;
}

const logs = [
  "Neural Engine Initialized...",
  "Optical Sensor: Online",
  "Fitzpatrick Scale: Calibrating",
  "Latency: 42ms",
  "Ready for scan..."
];

export default function StatusSidebar({ modelStatus, isScanning }: StatusSidebarProps) {
  return (
    <div className="hidden xl:block w-64 font-mono text-[10px] text-cyan-500/60 uppercase p-4 border-l border-zinc-800">
      <div className="mb-4 text-cyan-400 font-bold border-b border-cyan-500/20 pb-2">
        {isScanning ? "🔍 Scanning..." : "System Telemetry"}
      </div>
      <div className="space-y-2">
        {logs.map((log, i) => (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="flex gap-2"
          >
            <span className="text-zinc-700">[{new Date().toLocaleTimeString()}]</span>
            <span>{log}</span>
          </motion.div>
        ))}
        {modelStatus && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: logs.length * 0.1 }}
            className="flex gap-2 pt-2 border-t border-cyan-500/10"
          >
            <span className="text-zinc-700">[Status]</span>
            <span className={modelStatus.includes("Error") ? "text-red-500" : "text-green-500"}>
              {modelStatus}
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}