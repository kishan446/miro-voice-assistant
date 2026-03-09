import { useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, Paperclip, X, LogOut, Heart } from "lucide-react";
import SupportModal from "./SupportModal";
import MiroOrb from "./MiroOrb";
import VoiceVisualizer from "./VoiceVisualizer";
import MicStatusIndicator from "./MicStatusIndicator";
import ChatConsole, { type ChatMessage, type ChatAttachment } from "./ChatConsole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const MiroInterface = () => {
  const [isAwake, setIsAwake] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [statusText, setStatusText] = useState("Tap the orb to start voice chat");
  const [textInput, setTextInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const voiceEnabledRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keep refs in sync
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const addMessage = useCallback((role: "user" | "assistant", content: string, attachments?: ChatAttachment[]) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date(), attachments },
    ]);
  }, []);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  // Keep session alive
  useEffect(() => {
    const interval = setInterval(async () => {
      try { await supabase.auth.refreshSession(); } catch {}
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecognition();
      window.speechSynthesis.cancel();
    };
  }, []);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
  };

  const handleLogout = async () => {
    stopRecognition();
    window.speechSynthesis.cancel();
    try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
    navigate("/auth", { replace: true });
  };

  const uploadFiles = async (files: File[]): Promise<ChatAttachment[]> => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user?.id;
    if (!userId) throw new Error("Not authenticated");

    const uploaded: ChatAttachment[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type });
      if (error) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: signedData, error: signErr } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 3600);
      if (signErr || !signedData) { toast.error(`Failed to get URL for ${file.name}`); continue; }

      uploaded.push({ name: file.name, type: file.type, url: signedData.signedUrl });
    }
    return uploaded;
  };

  // ========== CORE VOICE FUNCTIONS (using plain functions + refs to avoid circular deps) ==========

  function startWakeWordListening() {
    if (!voiceEnabledRef.current) return;
    stopRecognition();

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    setStatusText('Say "MIRO" or tap orb');

    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase().trim();
        if (transcript.includes("miro") || transcript.includes("mirror") || transcript.includes("hero") || transcript.includes("meeru")) {
          stopRecognition();
          setIsAwake(true);
          setStatusText("Activated! Speak your command...");
          // Delay to avoid picking up the wake word as command
          setTimeout(() => startCommandListening(), 500);
          return;
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatusText("Mic unavailable — type below");
        setVoiceEnabled(false);
        return;
      }
      // Auto-retry for recoverable errors
      if (event.error !== "aborted") {
        setTimeout(() => {
          if (!isProcessingRef.current && !isSpeakingRef.current && voiceEnabledRef.current) {
            startWakeWordListening();
          }
        }, 2000);
      }
    };

    recognition.onend = () => {
      // Auto-restart if not doing something else
      if (!isProcessingRef.current && !isSpeakingRef.current && voiceEnabledRef.current) {
        setTimeout(() => startWakeWordListening(), 500);
      }
    };

    try { recognition.start(); } catch (e) {
      console.warn("Could not start wake word listener:", e);
    }
  }

  function speakResponse(text: string) {
    setIsSpeaking(true);
    setStatusText("🔊 SPEAKING...");
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Detect language from script
      const detectLang = (t: string): string => {
        if (/[\u0C80-\u0CFF]/.test(t)) return "kn-IN";
        if (/[\u0900-\u097F]/.test(t)) return "hi-IN";
        if (/[\u0B80-\u0BFF]/.test(t)) return "ta-IN";
        if (/[\u0C00-\u0C7F]/.test(t)) return "te-IN";
        if (/[\u0980-\u09FF]/.test(t)) return "bn-IN";
        if (/[\u0A80-\u0AFF]/.test(t)) return "gu-IN";
        if (/[\u0A00-\u0A7F]/.test(t)) return "pa-IN";
        if (/[\u0D00-\u0D7F]/.test(t)) return "ml-IN";
        return "en-IN";
      };
      utterance.lang = detectLang(text);

      // Pick best available voice
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang === utterance.lang && v.name.toLowerCase().includes("female"))
        || voices.find(v => v.lang === utterance.lang && v.name.toLowerCase().includes("natural"))
        || voices.find(v => v.lang === utterance.lang)
        || voices.find(v => v.lang.startsWith(utterance.lang.split("-")[0]))
        || voices.find(v => v.lang === "en-IN")
        || voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
        || voices.find(v => v.lang.startsWith("en"));
      if (voice) utterance.voice = voice;

      const onDone = () => {
        setIsSpeaking(false);
        setStatusText('Say "MIRO" or tap orb');
        startWakeWordListening();
      };

      utterance.onend = onDone;
      utterance.onerror = onDone;

      window.speechSynthesis.speak(utterance);

      // Chrome bug: speechSynthesis stops after ~15s. Workaround: keep it alive.
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAlive);
          return;
        }
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }, 10000);

      utterance.onend = () => { clearInterval(keepAlive); onDone(); };
      utterance.onerror = () => { clearInterval(keepAlive); onDone(); };
    }, 150);
  }

  async function processQuery(query: string, attachments?: ChatAttachment[]) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setIsListening(false);
    setStatusText("⚡ PROCESSING...");
    stopRecognition();

    addMessage("user", query, attachments);

    try {
      // Refresh session before API call
      try { await supabase.auth.refreshSession(); } catch {}

      const recentMessages = messagesRef.current
        .filter(m => m.content)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      let lastError: any = null;
      let data: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          console.log(`[MIRO] Calling miro-chat (attempt ${attempt + 1})...`);
          
          // Create abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
          
          const result = await supabase.functions.invoke("miro-chat", {
            body: {
              query,
              messages: recentMessages,
              attachments: attachments?.map(a => ({ type: a.type, url: a.url })),
            },
          });
          
          clearTimeout(timeoutId);

          if (result.error) {
            console.error("[MIRO] API error:", result.error);
            if (result.error.message?.includes("401") || result.error.message?.includes("Unauthorized")) {
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData.session) {
                toast.error("Session expired. Please sign in again.");
                navigate("/auth", { replace: true });
                return;
              }
              continue;
            }
            throw result.error;
          }

          data = result.data;
          console.log("[MIRO] Got response:", data?.response?.slice(0, 100));
          break;
        } catch (err: any) {
          lastError = err;
          console.warn(`[MIRO] Attempt ${attempt + 1} failed:`, err?.message || err);
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (!data && lastError) throw lastError;

      const responseText = data?.response || "I couldn't process that request.";
      addMessage("assistant", responseText);
      setIsProcessing(false);
      isProcessingRef.current = false;
      speakResponse(responseText);
    } catch (e: any) {
      console.error("Chat error:", e);
      const msg = e?.message || "";
      if (msg.includes("429")) {
        toast.error("Too many requests. Please wait.");
        addMessage("assistant", "Too many requests. Please wait a moment.");
      } else if (msg.includes("402")) {
        toast.error("AI credits exhausted.");
        addMessage("assistant", "AI credits have run out.");
      } else if (msg.includes("fetch") || msg.includes("network")) {
        toast.error("Network error.");
        addMessage("assistant", "Network error. Please check your connection.");
      } else {
        toast.error("Failed to process request");
        addMessage("assistant", "Sorry, I couldn't process that. Please try again.");
      }
      setIsProcessing(false);
      isProcessingRef.current = false;
      setStatusText("Tap orb or type below");
      startWakeWordListening();
    }
  }

  function startCommandListening() {
    stopRecognition();

    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-IN";
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;

    let gotResult = false;

    setIsListening(true);
    setStatusText("🎤 LISTENING — Speak now...");

    recognition.onresult = (event: any) => {
      gotResult = true;
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      console.log("[MIRO] Recognized:", transcript, "confidence:", event.results[0]?.[0]?.confidence);
      if (transcript && transcript.length > 0) {
        setIsListening(false);
        processQuery(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("[MIRO] Speech error:", event.error);
      setIsListening(false);
      if (event.error === "no-speech") {
        setStatusText("No speech detected — tap orb to retry");
        toast("No speech detected. Tap the orb to try again.");
        if (voiceEnabledRef.current) startWakeWordListening();
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatusText("Mic blocked — type below");
        toast.error("Microphone access denied.");
        setVoiceEnabled(false);
        voiceEnabledRef.current = false;
      } else if (event.error === "network") {
        setStatusText("Network error — tap orb to retry");
        toast.error("Network error during speech recognition");
      } else if (event.error !== "aborted") {
        setStatusText("Error — tap orb to retry");
      }
    };

    recognition.onend = () => {
      // If we didn't get a result and aren't processing, go back to wake word
      if (!gotResult && !isProcessingRef.current) {
        setIsListening(false);
        if (voiceEnabledRef.current) {
          setTimeout(() => startWakeWordListening(), 300);
        }
      }
    };

    try {
      recognition.start();
      console.log("[MIRO] Command listening started");
    } catch (e) {
      console.error("[MIRO] Failed to start recognition:", e);
      setIsListening(false);
      toast.error("Could not start microphone");
    }
  }

  // Handle orb click — USER GESTURE that enables mic
  const handleOrbClick = async () => {
    console.log("[MIRO] Orb clicked. voiceEnabled:", voiceEnabledRef.current, "isSpeaking:", isSpeakingRef.current);
    
    // Stop any current speech
    if (isSpeakingRef.current) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }

    // Check if SpeechRecognition is available
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast.error("Speech recognition is not supported in this browser. Please use Chrome.");
      setStatusText("Voice not supported — use text input");
      return;
    }

    // Request mic permission on first click (MUST be in direct user gesture)
    if (!voiceEnabledRef.current) {
      try {
        console.log("[MIRO] Requesting microphone permission...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        stream.getTracks().forEach(track => track.stop());
        setVoiceEnabled(true);
        voiceEnabledRef.current = true;
        console.log("[MIRO] Microphone permission granted!");
        toast.success("Microphone enabled! Speak now.");
      } catch (err: any) {
        console.error("[MIRO] Mic permission error:", err?.name, err?.message);
        toast.error("Microphone access denied. Please allow mic access and try again.");
        setStatusText("Mic blocked — allow mic in browser settings");
        return;
      }
    }

    setIsAwake(true);
    setStatusText("Starting speech recognition...");
    // Small delay to ensure UI updates before starting recognition
    setTimeout(() => startCommandListening(), 100);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const query = textInput.trim();
    if (!query && pendingFiles.length === 0) return;
    if (isProcessing || isUploading) return;

    setIsAwake(true);
    setTextInput("");

    let attachments: ChatAttachment[] | undefined;
    if (pendingFiles.length > 0) {
      setIsUploading(true);
      try {
        attachments = await uploadFiles(pendingFiles);
        setPendingFiles([]);
      } catch (err) {
        toast.error("Failed to upload files");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const finalQuery = query || (attachments?.length ? "What's in this file?" : "");
    if (finalQuery) processQuery(finalQuery, attachments);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid = files.filter(f => {
      if (f.size > 10 * 1024 * 1024) {
        toast.error(`${f.name} is too large (max 10MB)`);
        return false;
      }
      return true;
    });
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background relative overflow-hidden px-4">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(187_100%_50%/0.05)_0%,transparent_70%)]" />

      {/* Logout */}
      <motion.button
        onClick={handleLogout}
        className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm font-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        title="Sign out"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </motion.button>

      {/* Title */}
      <motion.div
        className="text-center mb-6 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-wider text-foreground text-glow">
          MIRO
        </h1>
        <p className="font-body text-muted-foreground text-lg mt-2 tracking-wide">
          Voice-Chat AI Assistant
        </p>
      </motion.div>

      {/* Chat console */}
      <div className="z-10 w-full mb-4">
        <ChatConsole messages={messages} isProcessing={isProcessing} />
      </div>

      {/* Orb */}
      <motion.div
        className="z-10 mb-6"
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

      {/* Mic Status Indicator */}
      <motion.div
        className="z-10 mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        <MicStatusIndicator
          voiceEnabled={voiceEnabled}
          isListening={isListening}
          isSpeaking={isSpeaking}
          isProcessing={isProcessing}
        />
      </motion.div>


      {/* Visualizer */}
      <motion.div
        className="z-10 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <VoiceVisualizer
          isActive={isListening || isSpeaking}
          label={isListening ? "LISTENING" : isSpeaking ? "SPEAKING" : "LISTENING"}
        />
      </motion.div>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <motion.div
          className="z-10 w-full max-w-lg mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap gap-2 px-1">
            {pendingFiles.map((file, i) => (
              <div key={i} className="relative group flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5">
                {file.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <span className="text-xs">📎</span>
                )}
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removePendingFile(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Text input */}
      <motion.div
        className="z-10 w-full max-w-lg mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.csv,.json" onChange={handleFileSelect} className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isUploading}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-lg px-3 py-3 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isUploading ? "Uploading..." : "Type a command to MIRO..."}
            disabled={isProcessing || isUploading}
            className="flex-1 bg-card/50 backdrop-blur-sm border border-border rounded-lg px-4 py-3 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary border-glow"
          />
          <button
            type="submit"
            disabled={isProcessing || isUploading || (!textInput.trim() && pendingFiles.length === 0)}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg px-4 py-3 text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="bg-destructive/20 hover:bg-destructive/30 border border-destructive/50 rounded-lg px-4 py-3 text-destructive transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </form>
      </motion.div>

      {/* Support button */}
      <motion.button
        onClick={() => setSupportOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-3 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all group glow-cyan"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Heart className="w-4 h-4 text-destructive group-hover:fill-destructive transition-all" />
        <span className="text-sm font-body font-semibold">Support MIRO</span>
      </motion.button>

      <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
  );
};

export default MiroInterface;
