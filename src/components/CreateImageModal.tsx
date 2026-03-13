import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Loader2, Download, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateImageModalProps {
  open: boolean;
  onClose: () => void;
  onImageCreated: (imageUrl: string, prompt: string) => void;
}

const CreateImageModal = ({ open, onClose, onImageCreated }: CreateImageModalProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGeneratedImage(null);

    try {
      const result = await supabase.functions.invoke("miro-image-gen", {
        body: { prompt: prompt.trim() },
      });

      if (result.error) throw result.error;

      const imageUrl = result.data?.imageUrl;
      if (!imageUrl) throw new Error("No image returned");

      setGeneratedImage(imageUrl);
    } catch (err: any) {
      console.error("Image generation error:", err);
      if (err?.message?.includes("429")) {
        toast.error("Too many requests. Please wait.");
      } else if (err?.message?.includes("402")) {
        toast.error("AI credits exhausted.");
      } else {
        toast.error("Failed to generate image");
      }
    }
    setGenerating(false);
  };

  const handleSendToChat = () => {
    if (generatedImage) {
      onImageCreated(generatedImage, prompt);
      setPrompt("");
      setGeneratedImage(null);
      onClose();
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = `miro-image-${Date.now()}.png`;
    a.click();
  };

  const handleClose = () => {
    setPrompt("");
    setGeneratedImage(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h3 className="font-display text-sm tracking-wider text-foreground">CREATE IMAGE</h3>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Prompt input */}
              <div className="space-y-2">
                <label className="text-xs font-body text-muted-foreground">Describe the image you want to create</label>
                <div className="flex gap-2">
                  <input
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    placeholder="A futuristic city at sunset with flying cars..."
                    disabled={generating}
                    className="flex-1 bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || generating}
                    className="shrink-0 w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Generated image preview */}
              {generating && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-body">Creating your image...</p>
                </div>
              )}

              {generatedImage && !generating && (
                <div className="space-y-3">
                  <img
                    src={generatedImage}
                    alt={prompt}
                    className="w-full rounded-xl border border-border max-h-[300px] object-contain bg-secondary/20"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSendToChat}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <Send className="w-4 h-4" />
                      Send to Chat
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-body text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreateImageModal;
