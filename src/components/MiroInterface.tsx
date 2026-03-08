import { useState, useCallback, useRef, useEffect, FormEvent } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, Paperclip, X, LogOut, Image } from "lucide-react";
import MiroOrb from "./MiroOrb";
import VoiceVisualizer from "./VoiceVisualizer";
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
  const [statusText, setStatusText] = useState('Say "MIRO" or type below');
  const [textInput, setTextInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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

  // Keep session alive with periodic refresh every 10 minutes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn("Session refresh failed:", error.message);
        }
      } catch (e) {
        console.warn("Session refresh error:", e);
      }
    }, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    window.speechSynthesis.cancel();
    await supabase.auth.signOut();
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

      if (error) {
        console.error("Upload error:", error);
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: signedData, error: signErr } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 3600);

      if (signErr || !signedData) {
        console.error("Signed URL error:", signErr);
        toast.error(`Failed to get URL for ${file.name}`);
        continue;
      }

      uploaded.push({
        name: file.name,
        type: file.type,
        url: signedData.signedUrl,
      });
    }
    return uploaded;
  };

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
    
    const langConfig: Record<string, { langCode: string; rate: number; pitch: number; voiceNames: string[] }> = {
      kn: { langCode: "kn-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google ಕನ್ನಡ", "Microsoft Sapna", "Sapna", "kn-IN", "kannada"] },
      hi: { langCode: "hi-IN", rate: 0.88, pitch: 1.2, voiceNames: ["Google हिन्दी", "Microsoft Swara", "Microsoft Kalpana", "Swara", "Kalpana", "Lekha", "hi-IN", "hindi"] },
      ta: { langCode: "ta-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google தமிழ்", "ta-IN", "tamil"] },
      te: { langCode: "te-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google తెలుగు", "te-IN", "telugu"] },
      bn: { langCode: "bn-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google বাংলা", "bn-IN", "bengali"] },
      gu: { langCode: "gu-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google ગુજરાતી", "gu-IN", "gujarati"] },
      pa: { langCode: "pa-IN", rate: 0.85, pitch: 1.15, voiceNames: ["pa-IN", "punjabi"] },
      ml: { langCode: "ml-IN", rate: 0.85, pitch: 1.15, voiceNames: ["Google മലയാളം", "ml-IN", "malayalam"] },
      en: { langCode: "en-IN", rate: 0.92, pitch: 1.25, voiceNames: ["Microsoft Neerja Online (Natural)", "Microsoft Swara Online (Natural)", "Google UK English Female", "Samantha", "Neerja", "Zira"] },
    };
    
    const config = langConfig[lang] || langConfig.en;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = 1.0;
    utterance.lang = config.langCode;
    
    const voices = window.speechSynthesis.getVoices();
    let bestVoice: SpeechSynthesisVoice | undefined;
    
    for (const name of config.voiceNames) {
      bestVoice = voices.find(v => v.name.includes(name));
      if (bestVoice) break;
    }
    
    if (!bestVoice) {
      bestVoice = voices.find(v => v.lang === config.langCode && v.name.toLowerCase().includes("natural"))
        || voices.find(v => v.lang === config.langCode && v.name.toLowerCase().includes("female"))
        || voices.find(v => v.lang === config.langCode)
        || voices.find(v => v.lang.startsWith(lang));
    }
    
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

  const processQuery = useCallback(async (query: string, attachments?: ChatAttachment[]) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setIsListening(false);
    setStatusText("PROCESSING");

    addMessage("user", query, attachments);

    try {
      // Try to refresh session, but don't block on failure - proceed with existing token
      try {
        await supabase.auth.refreshSession();
      } catch (refreshErr) {
        console.warn("Session refresh failed, proceeding with existing token:", refreshErr);
      }

      const recentMessages = messages
        .filter(m => m.content)
        .slice(-6)
        .map(m => ({ role: m.role, content: m.content }));

      // Retry logic for network failures
      let lastError: any = null;
      let data: any = null;
      
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await supabase.functions.invoke("miro-chat", {
            body: {
              query,
              messages: recentMessages,
              attachments: attachments?.map(a => ({ type: a.type, url: a.url })),
            },
          });
          
          if (result.error) {
            if (result.error.message?.includes("401") || result.error.message?.includes("Unauthorized")) {
              // Try to recover session once
              const { data: sessionData } = await supabase.auth.getSession();
              if (!sessionData.session) {
                toast.error("Session expired. Please sign in again.");
                navigate("/auth", { replace: true });
                return;
              }
              // Session exists, retry
              continue;
            }
            throw result.error;
          }
          
          data = result.data;
          break;
        } catch (err) {
          lastError = err;
          if (attempt === 0) {
            await new Promise(r => setTimeout(r, 500)); // brief delay before retry
          }
        }
      }

      if (!data && lastError) {
        throw lastError;
      }

      const responseText = data?.response || "I couldn't process that request.";
      addMessage("assistant", responseText);
      setIsProcessing(false);
      await speakResponse(responseText);
    } catch (e: any) {
      console.error("Chat error:", e);
      const msg = e?.message || "";
      if (msg.includes("429")) {
        toast.error("Too many requests. Please wait a moment.");
        addMessage("assistant", "I'm getting too many requests right now. Please wait a moment and try again.");
      } else if (msg.includes("402")) {
        toast.error("AI credits exhausted. Please add credits.");
        addMessage("assistant", "AI credits have run out. Please add credits to continue.");
      } else if (msg.includes("fetch") || msg.includes("network")) {
        toast.error("Network error. Please check your connection.");
        addMessage("assistant", "I'm having trouble connecting. Please check your internet and try again.");
      } else {
        toast.error("Failed to process your request");
        addMessage("assistant", "Sorry, I couldn't process that. Please try again.");
      }
      setIsProcessing(false);
      setStatusText('Say "MIRO" for another question');
      startWakeWordListening();
    } finally {
      isProcessingRef.current = false;
    }
  }, [messages, addMessage, speakResponse]);

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
        console.error("Upload error:", err);
        toast.error("Failed to upload files");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const finalQuery = query || (attachments?.length ? "What's in this file?" : "");
    if (finalQuery) {
      processQuery(finalQuery, attachments);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file sizes (10MB max each)
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
    recognition.lang = "en-IN";
    recognitionRef.current = recognition;

    setIsListening(true);
    setStatusText("LISTENING");

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript) {
        processQuery(transcript);
      }
    };

    recognition.onerror = (event: any) => {
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

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        console.warn("Microphone permission denied. Use the text input instead.");
        setStatusText("Mic unavailable — type below");
        return;
      }
      if (event.error !== "no-speech" && event.error !== "aborted" && event.error !== "network") {
        console.error("Wake word error:", event.error);
      }
      setTimeout(() => startWakeWordListening(), 2000);
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
      window.speechSynthesis.cancel();
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

      {/* Logout button */}
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
          Voice-Activated AI Assistant
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

      {/* Visualizer */}
      <motion.div
        className="z-10 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <VoiceVisualizer
          isActive={isListening || isSpeaking}
          label={isListening ? "LISTENING" : isSpeaking ? "SPEAKING" : "STANDBY"}
        />
      </motion.div>

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <motion.div
          className="z-10 w-full max-w-lg mb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-wrap gap-2 px-1">
            {pendingFiles.map((file, i) => (
              <div
                key={i}
                className="relative group flex items-center gap-2 bg-card/60 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5"
              >
                {file.type.startsWith("image/") ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-8 h-8 rounded object-cover"
                  />
                ) : (
                  <span className="text-xs">📎</span>
                )}
                <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                  {file.name}
                </span>
                <button
                  onClick={() => removePendingFile(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Text input with file upload */}
      <motion.div
        className="z-10 w-full max-w-lg mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf,.txt,.csv,.json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isUploading}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-lg px-3 py-3 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach files or photos"
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
