import { motion } from "framer-motion";

interface VoiceVisualizerProps {
  isActive: boolean;
  label: string;
}

const VoiceVisualizer = ({ isActive, label }: VoiceVisualizerProps) => {
  const barCount = 20;

  return (
    <div className="flex flex-col items-center gap-3">
      <span className="font-display text-xs tracking-[0.3em] text-primary uppercase text-glow">
        {label}
      </span>
      <div className="flex items-center gap-[3px] h-10">
        {Array.from({ length: barCount }).map((_, i) => (
          <motion.div
            key={i}
            className="w-[3px] rounded-full bg-primary-foreground border border-primary/20 shadow-[0_0_6px_hsl(var(--primary)/0.3)]"
            animate={
              isActive
                ? {
                    height: [8, Math.random() * 28 + 12, 8],
                    opacity: [0.4, 1, 0.4],
                  }
                : { height: 4, opacity: 0.2 }
            }
            transition={
              isActive
                ? {
                    duration: 0.3 + Math.random() * 0.4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.03,
                  }
                : { duration: 0.3 }
            }
          />
        ))}
      </div>
    </div>
  );
};

export default VoiceVisualizer;
