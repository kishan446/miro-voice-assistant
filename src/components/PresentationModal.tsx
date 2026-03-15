import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Presentation, Loader2, Download, ChevronLeft, ChevronRight,
  Maximize, GripVertical, Type, Trash2, Plus, Edit3, Check
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Slide {
  type: string;
  title: string;
  subtitle?: string;
  content?: string;
  bullets?: string[];
  leftContent?: string;
  rightContent?: string;
  quote?: string;
  quoteAuthor?: string;
  stats?: { label: string; value: string }[];
  notes?: string;
  imageQuery?: string;
}

interface PresentationModalProps {
  open: boolean;
  onClose: () => void;
}

const THEMES = {
  "modern-dark": { bg: "bg-[#0a0a0a]", text: "text-white", accent: "text-cyan-400", accentBg: "bg-cyan-500/10", border: "border-cyan-500/20", gradientFrom: "from-cyan-500/20", gradientTo: "to-purple-500/20" },
  "minimal-light": { bg: "bg-white", text: "text-gray-900", accent: "text-blue-600", accentBg: "bg-blue-50", border: "border-blue-200", gradientFrom: "from-blue-50", gradientTo: "to-indigo-50" },
  "sunset": { bg: "bg-[#1a0a1e]", text: "text-white", accent: "text-orange-400", accentBg: "bg-orange-500/10", border: "border-orange-500/20", gradientFrom: "from-orange-500/20", gradientTo: "to-pink-500/20" },
  "forest": { bg: "bg-[#0a1a0e]", text: "text-white", accent: "text-emerald-400", accentBg: "bg-emerald-500/10", border: "border-emerald-500/20", gradientFrom: "from-emerald-500/20", gradientTo: "to-teal-500/20" },
};

type ThemeKey = keyof typeof THEMES;

const PresentationModal = ({ open, onClose }: PresentationModalProps) => {
  const [topic, setTopic] = useState("");
  const [slideCount, setSlideCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [theme, setTheme] = useState<ThemeKey>("modern-dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const t = THEMES[theme];

  const handleGenerate = async () => {
    if (!topic.trim() || generating) return;
    setGenerating(true);
    setSlides([]);
    setCurrentSlide(0);

    try {
      const result = await supabase.functions.invoke("miro-ppt-gen", {
        body: { topic: topic.trim(), slideCount, theme },
      });
      if (result.error) throw result.error;
      const s = result.data?.slides;
      if (!Array.isArray(s) || s.length === 0) throw new Error("No slides");
      setSlides(s);
    } catch (err: any) {
      if (err?.message?.includes("429")) toast.error("Too many requests.");
      else if (err?.message?.includes("402")) toast.error("AI credits exhausted.");
      else toast.error("Failed to generate presentation");
    }
    setGenerating(false);
  };

  const handleFullscreen = () => {
    if (!fullscreenRef.current) return;
    if (!document.fullscreenElement) {
      fullscreenRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const startEdit = (idx: number) => {
    setEditingSlide(idx);
    setEditTitle(slides[idx].title);
    setEditContent(slides[idx].content || slides[idx].bullets?.join("\n") || "");
  };

  const saveEdit = () => {
    if (editingSlide === null) return;
    setSlides(prev => prev.map((s, i) => {
      if (i !== editingSlide) return s;
      const updated = { ...s, title: editTitle };
      if (s.bullets) updated.bullets = editContent.split("\n").filter(Boolean);
      else updated.content = editContent;
      return updated;
    }));
    setEditingSlide(null);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    setSlides(prev => prev.filter((_, i) => i !== idx));
    if (currentSlide >= slides.length - 1) setCurrentSlide(Math.max(0, slides.length - 2));
  };

  const addSlide = (afterIdx: number) => {
    const newSlide: Slide = { type: "content", title: "New Slide", content: "Add your content here" };
    setSlides(prev => [...prev.slice(0, afterIdx + 1), newSlide, ...prev.slice(afterIdx + 1)]);
    setCurrentSlide(afterIdx + 1);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setSlides(prev => {
      const newSlides = [...prev];
      const [moved] = newSlides.splice(dragIdx, 1);
      newSlides.splice(idx, 0, moved);
      return newSlides;
    });
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  const exportToHtml = () => {
    const slidesHtml = slides.map((s, i) => {
      let inner = "";
      if (s.type === "title" || s.type === "closing") {
        inner = `<h1 style="font-size:3rem;font-weight:bold;margin-bottom:1rem">${s.title}</h1>${s.subtitle ? `<p style="font-size:1.5rem;opacity:0.7">${s.subtitle}</p>` : ""}`;
      } else if (s.type === "bullet-list") {
        inner = `<h2 style="font-size:2rem;font-weight:bold;margin-bottom:1.5rem">${s.title}</h2><ul style="font-size:1.3rem;line-height:2">${(s.bullets || []).map(b => `<li>${b}</li>`).join("")}</ul>`;
      } else if (s.type === "stats") {
        inner = `<h2 style="font-size:2rem;font-weight:bold;margin-bottom:2rem">${s.title}</h2><div style="display:flex;gap:2rem;flex-wrap:wrap;justify-content:center">${(s.stats || []).map(st => `<div style="text-align:center;min-width:150px"><div style="font-size:2.5rem;font-weight:bold;color:#06b6d4">${st.value}</div><div style="font-size:1rem;opacity:0.7">${st.label}</div></div>`).join("")}</div>`;
      } else if (s.type === "quote") {
        inner = `<blockquote style="font-size:1.8rem;font-style:italic;border-left:4px solid #06b6d4;padding-left:1.5rem;margin:2rem 0">"${s.quote}"</blockquote>${s.quoteAuthor ? `<p style="font-size:1.2rem;opacity:0.7">— ${s.quoteAuthor}</p>` : ""}`;
      } else if (s.type === "two-column") {
        inner = `<h2 style="font-size:2rem;font-weight:bold;margin-bottom:1.5rem;width:100%">${s.title}</h2><div style="display:flex;gap:2rem;width:100%"><div style="flex:1;font-size:1.1rem;line-height:1.8">${s.leftContent || ""}</div><div style="flex:1;font-size:1.1rem;line-height:1.8">${s.rightContent || ""}</div></div>`;
      } else {
        inner = `<h2 style="font-size:2rem;font-weight:bold;margin-bottom:1.5rem">${s.title}</h2><p style="font-size:1.2rem;line-height:1.8;opacity:0.9">${(s.content || "").replace(/\n/g, "<br>")}</p>`;
      }
      return `<div class="slide" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem;text-align:center"><span style="position:absolute;top:2rem;right:2rem;opacity:0.3;font-size:0.9rem">${i + 1}/${slides.length}</span>${inner}</div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Presentation</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:#0a0a0a;color:#fff;scroll-snap-type:y mandatory;overflow-y:scroll}.slide{scroll-snap-align:start;position:relative}</style></head><body>${slidesHtml}</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `presentation-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Presentation downloaded!");
  };

  const renderSlide = (slide: Slide, idx: number) => {
    const isEditing = editingSlide === idx;

    if (isEditing) {
      return (
        <div className={`w-full aspect-video ${t.bg} ${t.text} rounded-xl border ${t.border} p-8 flex flex-col gap-4`}>
          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="bg-transparent border-b border-current/20 text-2xl font-bold outline-none pb-2" />
          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} className="flex-1 bg-transparent border border-current/10 rounded-lg p-3 text-sm resize-none outline-none" placeholder="Content..." />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditingSlide(null)} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs">Cancel</button>
            <button onClick={saveEdit} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs flex items-center gap-1"><Check className="w-3 h-3" />Save</button>
          </div>
        </div>
      );
    }

    const bg = `bg-gradient-to-br ${t.gradientFrom} ${t.gradientTo}`;

    return (
      <div className={`w-full aspect-video ${t.bg} ${t.text} rounded-xl border ${t.border} relative overflow-hidden flex flex-col items-center justify-center p-8 text-center`}>
        <div className={`absolute inset-0 ${bg} opacity-50`} />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4 max-w-[80%]">
          {slide.type === "title" || slide.type === "closing" ? (
            <>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{slide.title}</h1>
              {slide.subtitle && <p className="text-lg opacity-70">{slide.subtitle}</p>}
            </>
          ) : slide.type === "bullet-list" ? (
            <>
              <h2 className="text-2xl font-bold mb-2">{slide.title}</h2>
              <ul className="text-left space-y-2 text-sm md:text-base">
                {(slide.bullets || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className={`mt-1.5 w-2 h-2 rounded-full ${t.accent === "text-cyan-400" ? "bg-cyan-400" : t.accent === "text-orange-400" ? "bg-orange-400" : t.accent === "text-emerald-400" ? "bg-emerald-400" : "bg-blue-600"} shrink-0`} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : slide.type === "stats" ? (
            <>
              <h2 className="text-2xl font-bold mb-4">{slide.title}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {(slide.stats || []).map((st, i) => (
                  <div key={i} className="text-center">
                    <div className={`text-2xl md:text-3xl font-bold ${t.accent}`}>{st.value}</div>
                    <div className="text-xs opacity-60 mt-1">{st.label}</div>
                  </div>
                ))}
              </div>
            </>
          ) : slide.type === "quote" ? (
            <>
              <blockquote className={`text-xl md:text-2xl italic border-l-4 ${t.border} pl-4 text-left`}>"{slide.quote}"</blockquote>
              {slide.quoteAuthor && <p className="opacity-60 text-sm mt-2">— {slide.quoteAuthor}</p>}
            </>
          ) : slide.type === "two-column" ? (
            <>
              <h2 className="text-2xl font-bold mb-4 w-full">{slide.title}</h2>
              <div className="flex gap-6 w-full text-left">
                <div className="flex-1 text-sm leading-relaxed">{slide.leftContent}</div>
                <div className="w-px bg-current opacity-10" />
                <div className="flex-1 text-sm leading-relaxed">{slide.rightContent}</div>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{slide.title}</h2>
              <p className="text-sm md:text-base opacity-80 leading-relaxed whitespace-pre-wrap">{slide.content}</p>
            </>
          )}
        </div>
        <span className="absolute bottom-3 right-4 text-xs opacity-30">{idx + 1}/{slides.length}</span>
      </div>
    );
  };

  const handleClose = () => {
    setTopic("");
    setSlides([]);
    setCurrentSlide(0);
    setEditingSlide(null);
    setIsFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen();
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
            ref={fullscreenRef}
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[95vh] flex flex-col"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Presentation className="w-5 h-5 text-primary" />
                <h3 className="font-display text-sm tracking-wider text-foreground">PRESENTATION GENERATOR</h3>
              </div>
              <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Input */}
              {slides.length === 0 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-body text-muted-foreground">Presentation topic</label>
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="Artificial Intelligence in Healthcare: Trends, Challenges, and Future..."
                      disabled={generating}
                      rows={3}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors resize-none"
                    />
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-body text-muted-foreground">Slides</label>
                      <select value={slideCount} onChange={e => setSlideCount(Number(e.target.value))} className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-sm font-body text-foreground focus:outline-none">
                        {[5, 8, 10, 12, 15].map(n => <option key={n} value={n}>{n} slides</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 flex-1">
                      <label className="text-xs font-body text-muted-foreground">Theme</label>
                      <select value={theme} onChange={e => setTheme(e.target.value as ThemeKey)} className="w-full bg-secondary/40 border border-border rounded-xl px-4 py-2.5 text-sm font-body text-foreground focus:outline-none">
                        <option value="modern-dark">Modern Dark</option>
                        <option value="minimal-light">Minimal Light</option>
                        <option value="sunset">Sunset</option>
                        <option value="forest">Forest</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={!topic.trim() || generating}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium disabled:opacity-30 hover:opacity-90 active:scale-[0.98] transition-all"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                    {generating ? "Generating slides..." : "Generate Presentation"}
                  </button>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-body">Creating your presentation...</p>
                </div>
              )}

              {/* Editor */}
              {slides.length > 0 && !generating && (
                <div className="space-y-4">
                  {/* Slide preview */}
                  <div className="relative">
                    {renderSlide(slides[currentSlide], currentSlide)}

                    {/* Nav */}
                    {editingSlide === null && (
                      <div className="absolute bottom-3 left-4 flex gap-1.5">
                        <button
                          onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                          disabled={currentSlide === 0}
                          className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/70 transition-colors"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                          disabled={currentSlide === slides.length - 1}
                          className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center disabled:opacity-20 hover:bg-black/70 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Slide actions */}
                    {editingSlide === null && (
                      <div className="absolute top-3 right-3 flex gap-1.5">
                        <button onClick={() => startEdit(currentSlide)} className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleFullscreen} className="w-8 h-8 rounded-lg bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors" title="Fullscreen">
                          <Maximize className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail strip */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {slides.map((slide, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={() => handleDragStart(i)}
                        onDragOver={(e) => handleDragOver(e, i)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setCurrentSlide(i)}
                        className={`shrink-0 w-28 cursor-pointer group relative rounded-lg border-2 transition-all ${currentSlide === i ? "border-primary" : "border-border hover:border-primary/30"}`}
                      >
                        <div className={`${t.bg} rounded-md p-2 aspect-video flex flex-col items-center justify-center`}>
                          <p className={`text-[8px] font-bold ${t.text} truncate w-full text-center`}>{slide.title}</p>
                          <span className={`text-[7px] ${t.text} opacity-40`}>{i + 1}</span>
                        </div>
                        <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); addSlide(i); }} className="w-4 h-4 rounded bg-primary/80 text-primary-foreground flex items-center justify-center" title="Add after">
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); deleteSlide(i); }} className="w-4 h-4 rounded bg-destructive/80 text-destructive-foreground flex items-center justify-center" title="Delete">
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                        <div className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                          <GripVertical className="w-3 h-3 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={exportToHtml}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-body text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download as HTML
                    </button>
                    <button
                      onClick={() => { setSlides([]); setCurrentSlide(0); }}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground font-body text-sm font-medium hover:bg-secondary/80 transition-all"
                    >
                      New
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

export default PresentationModal;
