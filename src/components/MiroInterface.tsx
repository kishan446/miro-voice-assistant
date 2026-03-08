import { useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, Trash2 } from "lucide-react";
import MiroOrb from "./MiroOrb";
import VoiceVisualizer from "./VoiceVisualizer";
import ChatConsole, { type ChatMessage } from "./ChatConsole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MiroInterface = () => {
  const [isAwake, setIsAwake] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusText, setStatusText] = useState('Say "MIRO" or type below');
  const [textInput, setTextInput] = useState("");
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    ]);
  }, []);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  const speakResponse = useCallback(async (text: string) => {
    setIsSpeaking(true);
    setStatusText("SPEAKING");
    
    window.speechSynthesis.cancel();
    
    const detectLang = (t: string): string => {
      if (/[\u0C80-\u0CFF]/.test(t)) return "kn";
      if (/[\u0900-\u097F]/.test(t)) return "hi";
      if (/[\u0B80-\u0BFF]/.test(t)) return "ta";
      if (/[\u0C00-\u0C7F]/.test(t)) return "te";
      if (/[\u0980-\u09FF]/.test(t)) return "bn";
      if (/[\u0A80-\u0AFF]/.test(t)) return "gu";
      if (/[\u0A00-\u0A7F]/.test(t)) return "pa";
      if (/[\u0D00-\u0D7F]/.test(t)) return "ml";
      return "en";
    };
    const lang = detectLang(text);
    
    // Language-specific voice & settings map
    const langConfig: Record<string, { langCode: string; rate: number; pitch: number; voiceNames: string[] }> = {
      kn: {
        langCode: "kn-IN",
        rate: 0.85,
        pitch: 1.15,
        voiceNames: ["Google ಕನ್ನಡ", "Microsoft Sapna", "Sapna", "kn-IN", "kannada"],
      },
      hi: {
        langCode: "hi-IN",
        rate: 0.88,
        pitch: 1.2,
        voiceNames: ["Google हिन्दी", "Microsoft Swara", "Microsoft Kalpana", "Swara", "Kalpana", "Lekha", "hi-IN", "hindi"],
      },
      ta: { langCode: "ta-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google தமிழ்", "ta-IN", "tamil"] },
      te: { langCode: "te-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google తెలుగు", "te-IN", "telugu"] },
      bn: { langCode: "bn-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google বাংলা", "bn-IN", "bengali"] },
      gu: { langCode: "gu-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google ગુજરાતી", "gu-IN", "gujarati"] },
      pa: { langCode: "pa-IN", rate: 0.85, pitch: 1.15, voiceNames: ["pa-IN", "punjabi"] },
      ml: { langCode: "ml-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google മലയാളം", "ml-IN", "malayalam"] },
      en: {
        langCode: "en-IN",
        rate: 0.92,
        pitch: 1.25,
        voiceNames: ["Microsoft Neerja Online (Natural)", "Microsoft Swara Online (Natural)", "Google UK English Female", "Samantha", "Neerja", "Zira"],
      },
    };
    
    const config = langConfig[lang] || langConfig.en;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 1.0;
    utterance.lang = config.langCode;
    
    // Find the best matching voice
    const voices = window.speechSynthesis.getVoices();
    let bestVoice: SpeechSynthesisVoice | undefined;
    
    // First: try exact name matches from our priority list
    for (const name of config.voiceNames) {
      bestVoice = voices.find(v => v.name.includes(name));
      if (bestVoice) break;
    }
    
    // Second: any voice matching the language with "female" or "Natural" in name
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === config.langCode && v.name.toLowerCase().includes("natural"))
        || voices.find(v => v.lang === config.langCode && v.name.toLowerCase().includes("female"))
        || voices.find(v => v.lang === config.langCode)
        || voices.find(v => v.lang.startsWith(lang));
    }
    
    // Fallback: Indian English female
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === "en-IN")
        || voices.find(v => v.name.includes("Google UK English Female"))
        || voices.find(v => v.name === "Samantha")
        || voices.find(v => v.lang.startsWith("en"));
    }
    
    if (bestVoice) utterance.voice = bestVoice;
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusText('Say "MIRO" or type below');
      startWakeWordListening();
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatusText('Say "MIRO" or type below');
      startWakeWordListening();
    };
    window.speechSynthesis.speak(utterance);
  }, []);

  const processQuery = useCallback(async (query: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setIsListening(false);
    setStatusText("PROCESSING");

    addMessage("user", query);

    try {
      // Refresh session to handle token expiry after idle periods
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData.session) {
        toast.error("Session expired. Please sign in again.");
        window.location.href = "/auth";
        return;
      }

      const recentMessages = messages
        .filter(m => m.content)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("miro-chat", {
        body: { query, messages: recentMessages },
      });

      if (error) {
        // If unauthorized, redirect to auth
        if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/auth";
          return;
        }
        throw error;
      }

      const responseText = data?.response || "I couldn't process that request.";
      addMessage("assistant", responseText);
      setIsProcessing(false);
      await speakResponse(responseText);
    } catch (e) {
      console.error("Chat error:", e);
      toast.error("Failed to process your request");
      setIsProcessing(false);
      setStatusText('Say "MIRO" for another question');
      startWakeWordListening();
    } finally {
      isProcessingRef.current = false;
    }
  }, [messages, addMessage, speakResponse]);

  const startCommandListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN"; // Default to Indian English, supports multilingual input
    recognitionRef.current = recognition;

    setIsListening(true);
    setStatusText("LISTENING");

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        processQuery(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("Speech error:", event.error);
      }
      setIsListening(false);
      setStatusText('Say "MIRO" for another question');
      startWakeWordListening();
    };

    recognition.onend = () => {
      if (isListening && !isProcessingRef.current) {
        setIsListening(false);
        startWakeWordListening();
      }
    };

    try { recognition.start(); } catch {}
  }, [processQuery]);

  const startWakeWordListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        if (transcript.includes("miro")) {
          recognition.stop();
          setIsAwake(true);
          setStatusText("Activated! Speak your command...");
          setTimeout(() => startCommandListening(), 300);
          return;
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech" && event.error !== "aborted" && event.error !== "network") {
        console.error("Wake word error:", event.error);
      }
      setTimeout(() => startWakeWordListening(), 1000);
    };

    recognition.onend = () => {
      if (!isProcessingRef.current && !isSpeaking) {
        setTimeout(() => startWakeWordListening(), 500);
      }
    };

    try { recognition.start(); } catch {}
  }, [startCommandListening, isSpeaking]);

  const handleOrbClick = useCallback(() => {
    if (isSpeaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsSpeaking(false);
    }
    setIsAwake(true);
    startCommandListening();
  }, [isSpeaking, startCommandListening]);

  useEffect(() => {
    startWakeWordListening();
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
      {/* Background grid effect */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(187_100%_50%/0.05)_0%,transparent_70%)]" />

      {/* Title */}
      <motion.div
        className="text-center mb-8 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider text-foreground text-glow">
          MIRO
        </h1>
        <p className="font-body text-muted-foreground text-lg mt-2 tracking-wide">
          Voice-Activated AI Assistant
        </p>
      </motion.div>

      {/* Chat console */}
      <div className="z-10 w-full mb-6">
        <ChatConsole messages={messages} isProcessing={isProcessing} />
      </div>

      {/* Orb */}
      <motion.div
        className="z-10 mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <MiroOrb
          isAwake={isAwake}
          isListening={isListening}
          isSpeaking={isSpeaking}
          onClick={handleOrbClick}
        />
      </motion.div>

      {/* Visualizer */}
      <motion.div
        className="z-10 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <VoiceVisualizer
          isActive={isListening || isSpeaking}
          label={isListening ? "LISTENING" : isSpeaking ? "SPEAKING" : "STANDBY"}
        />
      </motion.div>

      {/* Text input */}
      <motion.div
        className="z-10 w-full max-w-lg mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (textInput.trim() && !isProcessing) {
              setIsAwake(true);
              processQuery(textInput.trim());
              setTextInput("");
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type a command to MIRO..."
            disabled={isProcessing}
            className="flex-1 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary border-glow"
          />
          <button
            type="submit"
            disabled={isProcessing || !textInput.trim()}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg px-4 py-3 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="bg-destructive/20 hover:bg-destructive/30 border border-destructive/50 rounded-lg px-4 py-3 text-destructive transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </form>
      </motion.div>

    </div>
  );
};

export default MiroInterface;
