import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Globe, Loader2, Download, ExternalLink, Code } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WebsiteGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

const WebsiteGeneratorModal = ({ open, onClose }: WebsiteGeneratorModalProps) => {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setGeneratedHtml(null);
    setShowCode(false);

    try {
      const result = await supabase.functions.invoke("miro-website-gen", {
        body: { prompt: prompt.trim() },
      });

      if (result.error) throw result.error;
      const html = result.data?.html;
      if (!html) throw new Error("No HTML returned");
      setGeneratedHtml(html);
    } catch (err: any) {
      console.error("Website generation error:", err);
      if (err?.message?.includes("429")) {
        toast.error("Too many requests. Please wait.");
      } else if (err?.message?.includes("402")) {
        toast.error("AI credits exhausted.");
      } else {
        toast.error("Failed to generate website");
      }
    }
    setGenerating(false);
  };

  const handleDownload = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miro-website-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Website downloaded!");
  };

  const handleOpenPreview = () => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const handleClose = () => {
    setPrompt("");
    setGeneratedHtml(null);
    setShowCode(false);
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
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <h3 className="font-display text-sm tracking-wider text-foreground">WEBSITE GENERATOR</h3>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-xs font-body text-muted-foreground">Describe the website you want to build</label>
                <div className="flex gap-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A modern portfolio website with a dark theme, hero section, about me, projects grid, and contact form..."
                    disabled={generating}
                    rows={3}
                    className="flex-1 bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generating}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  {generating ? "Generating..." : "Generate Website"}
                </button>
              </div>

              {generating && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-body">Building your website...</p>
                </div>
              )}

              {generatedHtml && !generating && (
                <div className="space-y-3">
                  {/* Preview */}
                  <div className="rounded-xl border border-border overflow-hidden bg-white">
                    <iframe
                      srcDoc={generatedHtml}
                      title="Website Preview"
                      className="w-full h-[300px] border-0"
                      sandbox="allow-scripts"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleOpenPreview}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Full Preview
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-body text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-body text-sm font-medium hover:bg-secondary/80 active:scale-[0.98] transition-all"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Code view */}
                  {showCode && (
                    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                        <span className="text-xs text-muted-foreground font-body">HTML Source</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(generatedHtml); toast.success("Code copied!"); }}
                          className="text-xs text-primary font-body hover:underline"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="p-4 text-xs text-foreground font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                        {generatedHtml}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WebsiteGeneratorModal;
