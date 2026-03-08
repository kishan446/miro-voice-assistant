import { motion } from "framer-motion";

interface MiroOrbProps {
  isAwake: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  onClick: () => void;
}

const MiroOrb = ({ isAwake, isListening, isSpeaking, onClick }: MiroOrbProps) => {
  const getOrbState = () => {
    if (isSpeaking) return "speaking";
    if (isListening) return "listening";
    if (isAwake) return "awake";
    return "idle";
  };

  const state = getOrbState();

  const orbVariants = {
    idle: {
      scale: 1,
      boxShadow: "0 0 30px hsl(187 100% 50% / 0.15), 0 0 60px hsl(187 100% 50% / 0.05)",
    },
    awake: {
      scale: 1.05,
      boxShadow: "0 0 40px hsl(187 100% 50% / 0.3), 0 0 80px hsl(187 100% 50% / 0.15)",
    },
    listening: {
      scale: [1.05, 1.12, 1.05],
      boxShadow: [
        "0 0 40px hsl(187 100% 50% / 0.3), 0 0 80px hsl(187 100% 50% / 0.15)",
        "0 0 60px hsl(187 100% 50% / 0.5), 0 0 120px hsl(187 100% 50% / 0.25)",
        "0 0 40px hsl(187 100% 50% / 0.3), 0 0 80px hsl(187 100% 50% / 0.15)",
      ],
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
    },
    speaking: {
      scale: [1.05, 1.15, 1.05],
      boxShadow: [
        "0 0 50px hsl(187 100% 50% / 0.4), 0 0 100px hsl(187 100% 50% / 0.2)",
        "0 0 80px hsl(187 100% 50% / 0.6), 0 0 150px hsl(187 100% 50% / 0.3)",
        "0 0 50px hsl(187 100% 50% / 0.4), 0 0 100px hsl(187 100% 50% / 0.2)",
      ],
      transition: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
    },
  };

  const ringVariants = {
    idle: { opacity: 0.2, rotate: 0 },
    awake: { opacity: 0.5, rotate: 360, transition: { rotate: { duration: 20, repeat: Infinity, ease: "linear" } } },
    listening: { opacity: 0.7, rotate: 360, transition: { rotate: { duration: 8, repeat: Infinity, ease: "linear" } } },
    speaking: { opacity: 1, rotate: 360, transition: { rotate: { duration: 4, repeat: Infinity, ease: "linear" } } },
  };

  return (
    <div className="relative flex items-center justify-center cursor-pointer" onClick={onClick}>
      {/* Outer ring */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border border-primary/30"
        variants={ringVariants}
        animate={state}
        style={{ borderStyle: "dashed" }}
      />

      {/* Middle ring */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border-2 border-primary/20"
        animate={{ rotate: state === "idle" ? 0 : -360 }}
        transition={{ duration: state === "speaking" ? 6 : 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Core orb */}
      <motion.div
        className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/40 flex items-center justify-center backdrop-blur-sm"
        variants={orbVariants}
        animate={state}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {/* Inner glow */}
        <motion.div
          className="w-16 h-16 rounded-full bg-primary/30"
          animate={{
            opacity: state === "idle" ? [0.3, 0.6, 0.3] : [0.5, 1, 0.5],
            scale: state === "idle" ? [0.9, 1, 0.9] : [0.9, 1.1, 0.9],
          }}
          transition={{ duration: state === "speaking" ? 0.6 : 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
};

export default MiroOrb;
