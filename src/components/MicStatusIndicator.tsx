import { motion } from "framer-motion";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface MicStatusIndicatorProps {
  voiceEnabled: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
}

const MicStatusIndicator = ({ voiceEnabled, isListening, isSpeaking, isProcessing }: MicStatusIndicatorProps) => {
  const getStatus = () => {
    if (isSpeaking) return { icon: Mic, text: "Speaking", color: "text-primary", bg: "bg-primary/10 border-primary/30", spin: false };
    if (isListening) return { icon: Mic, text: "LISTENING", color: "text-green-400", bg: "bg-green-400/10 border-green-400/30", spin: false };
    if (voiceEnabled) return { icon: Mic, text: "LISTENING", color: "text-primary/70", bg: "bg-primary/5 border-primary/20", spin: false };
    return { icon: MicOff, text: "Mic Off", color: "text-muted-foreground", bg: "bg-muted/30 border-border", spin: false };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <motion.div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-body font-medium ${status.bg}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      key={status.text}
    >
      {isListening && (
        <motion.div
          className="w-2 h-2 rounded-full bg-green-400"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
      <Icon className={`w-3.5 h-3.5 ${status.color} ${status.spin ? "animate-spin" : ""}`} />
      <span className={status.color}>{status.text}</span>
    </motion.div>
  );
};

export default MicStatusIndicator;
