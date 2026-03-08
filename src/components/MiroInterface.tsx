import { useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
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

  const speakResponse = useCallback(async (text: string) => {
    setIsSpeaking(true);
    setStatusText("SPEAKING");
    
    // Use browser built-in TTS
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;
    utterance.pitch = 1.3;
    utterance.volume = 1.0;
    
    // Auto-detect language and pick the best female voice
    const voices = window.speechSynthesis.getVoices();
    const detectLang = (t: string): string => {
      if (/[\u0C80-\u0CFF]/.test(t)) return "kn"; // Kannada - priority
      if (/[\u0900-\u097F]/.test(t)) return "hi"; // Hindi - priority
      if (/[\u0B80-\u0BFF]/.test(t)) return "ta";
      if (/[\u0C00-\u0C7F]/.test(t)) return "te";
      if (/[\u0980-\u09FF]/.test(t)) return "bn";
      if (/[\u0A80-\u0AFF]/.test(t)) return "gu";
      if (/[\u0A00-\u0A7F]/.test(t)) return "pa";
      if (/[\u0D00-\u0D7F]/.test(t)) return "ml";
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(t)) return "ja";
      if (/[\uAC00-\uD7AF]/.test(t)) return "ko";
      if (/[\u4E00-\u9FFF]/.test(t)) return "zh";
      if (/[\u0600-\u06FF]/.test(t)) return "ar";
      return "en";
    };
    const lang = detectLang(text);
    utterance.lang = lang;
    
    // Find best female voice for detected language
    const langVoice = voices.find(v => v.lang.startsWith(lang) && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith(lang))
      || voices.find(v => v.name.includes("Google UK English Female"))
      || voices.find(v => v.name === "Samantha")
      || voices.find(v => v.name.toLowerCase().includes("female") && v.lang.startsWith("en"))
      || voices.find(v => v.lang.startsWith("en"));
    if (langVoice) utterance.voice = langVoice;
    
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
      const { data, error } = await supabase.functions.invoke("miro-chat", {
        body: { query, messages: messages.slice(-10) },
      });

      if (error) throw error;

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
        </form>
      </motion.div>

      {/* Status */}
      <motion.div
        className="z-10 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <div className="border border-border rounded-lg px-6 py-3 bg-card/50 backdrop-blur-sm border-glow">
          <p className="font-display text-xs tracking-widest text-primary text-glow">
            {statusText}
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            Voice or text — ask me anything
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default MiroInterface;
