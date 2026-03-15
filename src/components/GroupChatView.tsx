import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Users, Bot, User, ArrowLeft, Share2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ShareModal from "@/components/ShareModal";
import ChatAttachmentMenu, { type AttachmentItem } from "@/components/ChatAttachmentMenu";
import CreateImageModal from "@/components/CreateImageModal";
import WebsiteGeneratorModal from "@/components/WebsiteGeneratorModal";
import PresentationModal from "@/components/PresentationModal";
import type { DBChatMessage } from "@/hooks/useChatMessages";
import type { Conversation } from "@/hooks/useConversations";

interface GroupChatViewProps {
  conversation: Conversation | null;
  messages: DBChatMessage[];
  loading: boolean;
  onSendMessage: (content: string, type?: "user" | "assistant" | "system", attachments?: any[]) => Promise<any>;
  isGroup: boolean;
  memberCount?: number;
  onBack?: () => void;
}

const GroupChatView = ({ conversation, messages, loading, onSendMessage, isGroup, memberCount, onBack }: GroupChatViewProps) => {
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [createImageOpen, setCreateImageOpen] = useState(false);
  const [websiteGenOpen, setWebsiteGenOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setCurrentUserId(data.session?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  }, [textInput]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = textInput.trim();
    if ((!text && pendingAttachments.length === 0) || sending) return;
    setSending(true);
    setTextInput("");

    const attachments = pendingAttachments.length > 0 ? pendingAttachments.map(a => ({ name: a.name, type: a.type, url: a.url })) : undefined;
    const messageText = text || (attachments ? `Sent ${attachments.length} file${attachments.length > 1 ? "s" : ""}` : "");
    setPendingAttachments([]);

    await onSendMessage(messageText, "user", attachments);

    if (!isGroup) {
      setIsProcessing(true);
      try {
        const recentMsgs = messages.slice(-6).map(m => ({
          role: m.message_type === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
        recentMsgs.push({ role: "user", content: messageText });

        const result = await supabase.functions.invoke("miro-chat", {
          body: { query: messageText, messages: recentMsgs, attachments },
        });

        if (result.error) throw result.error;
        const responseText = result.data?.response || "I couldn't process that.";
        await onSendMessage(responseText, "assistant");
      } catch (err: any) {
        console.error("AI error:", err);
        if (err?.message?.includes("429")) {
          toast.error("Too many requests. Please wait.");
        } else if (err?.message?.includes("402")) {
          toast.error("AI credits exhausted.");
        } else {
          toast.error("Failed to get AI response");
        }
      }
      setIsProcessing(false);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFilesAttached = (attachments: AttachmentItem[]) => {
    setPendingAttachments(prev => [...prev, ...attachments]);
  };

  const removeAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageCreated = async (imageUrl: string, prompt: string) => {
    const content = `🎨 *Generated image:* "${prompt}"`;
    await onSendMessage(content, "user", [{ name: `generated-image.png`, type: "image/png", url: imageUrl }]);
  };

  const getSenderName = (msg: DBChatMessage) => {
    if (msg.message_type === "assistant") return "MIRO";
    if (msg.message_type === "system") return "System";
    const profile = msg.sender_profile as any;
    if (profile?.display_name) return profile.display_name;
    if (profile?.email) return profile.email.split("@")[0];
    return "You";
  };

  const isOwnMessage = (msg: DBChatMessage) => msg.sender_id === currentUserId;

  const renderAttachments = (msg: DBChatMessage) => {
    const attachments = msg.attachments as any[];
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {attachments.map((att: any, i: number) =>
          att.type?.startsWith("image/") ? (
            <img key={i} src={att.url} alt={att.name} className="max-w-[240px] max-h-[180px] rounded-lg border border-border object-cover cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(att.url, "_blank")} />
          ) : (
            <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 text-xs text-foreground hover:bg-secondary transition-colors border border-border">
              <span>📎</span>
              <span className="truncate max-w-[150px]">{att.name}</span>
            </a>
          )
        )}
      </div>
    );
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-body gap-4">
        <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border">
          <Bot className="w-10 h-10 text-muted-foreground/40" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-foreground mb-1">How can I help you today?</p>
          <p className="text-sm text-muted-foreground">Start a new chat or select a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-card/30 backdrop-blur-sm shrink-0">
        {onBack && (
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Back to home">
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGroup ? "bg-primary/10" : "bg-secondary"}`}>
          {isGroup ? <Users className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-sm tracking-wider text-foreground truncate">{conversation.title}</h2>
          {isGroup && memberCount ? (
            <p className="text-[11px] text-muted-foreground font-body">{memberCount} member{memberCount !== 1 ? "s" : ""}</p>
          ) : !isGroup ? (
            <p className="text-[11px] text-muted-foreground font-body">AI Assistant</p>
          ) : null}
        </div>
        <button onClick={() => setShareOpen(true)} disabled={messages.length === 0} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="Share conversation">
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
              <p className="text-muted-foreground text-sm font-body">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center border border-border">
                {isGroup ? <Users className="w-8 h-8 text-muted-foreground/40" /> : <Bot className="w-8 h-8 text-muted-foreground/40" />}
              </div>
              <div className="text-center">
                <p className="text-foreground font-medium font-body mb-1">{isGroup ? "Start the conversation!" : "How can I help you?"}</p>
                <p className="text-sm text-muted-foreground font-body">{isGroup ? "Send a message to your group" : "Ask me anything — I'm here to help"}</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg) => {
                const own = isOwnMessage(msg);
                const isAssistant = msg.message_type === "assistant";

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="flex gap-3 group">
                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${isAssistant ? "bg-primary text-primary-foreground" : own ? "bg-secondary text-foreground" : "bg-accent/10 text-accent-foreground"}`}>
                      {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-xs font-semibold font-body ${isAssistant ? "text-primary" : "text-foreground"}`}>{isAssistant ? "MIRO" : own ? "You" : getSenderName(msg)}</span>
                        <span className="text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">{new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {isAssistant ? (
                        <div className="prose prose-sm prose-invert max-w-none font-body text-sm leading-relaxed [&_p]:m-0 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_p]:text-foreground [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-secondary [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_pre]:bg-secondary [&_pre]:rounded-lg [&_pre]:p-3 [&_ul]:my-2 [&_ol]:my-2 [&_li]:text-foreground [&_h1]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_a]:text-primary [&_blockquote]:border-primary/30 [&_blockquote]:text-muted-foreground">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm font-body text-foreground leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      )}
                      {renderAttachments(msg)}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {isProcessing && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-primary font-body mb-1">MIRO</p>
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/60" animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Pending attachments preview */}
          {pendingAttachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {pendingAttachments.map((att, i) => (
                <div key={i} className="relative group/att">
                  {att.type.startsWith("image/") && att.preview ? (
                    <img src={att.preview} alt={att.name} className="w-16 h-16 rounded-lg border border-border object-cover" />
                  ) : (
                    <div className="flex items-center gap-1.5 bg-secondary/60 rounded-lg px-3 py-2 border border-border text-xs text-foreground">
                      <span>📎</span>
                      <span className="truncate max-w-[80px]">{att.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-secondary/40 border border-border rounded-2xl px-3 py-2 focus-within:border-primary/50 transition-colors">
              <ChatAttachmentMenu
                disabled={sending || isProcessing}
                onFilesAttached={handleFilesAttached}
                onCreateImage={() => setCreateImageOpen(true)}
                onBuildWebsite={() => setWebsiteGenOpen(true)}
                onCreatePPT={() => setPresentationOpen(true)}
              />
              <textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isGroup ? "Message the group..." : "Message MIRO..."}
                disabled={sending || isProcessing}
                rows={1}
                className="flex-1 bg-transparent text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none resize-none min-h-[24px] max-h-[200px] py-1"
              />
              <button
                type="submit"
                disabled={sending || isProcessing || (!textInput.trim() && pendingAttachments.length === 0)}
                className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2 font-body">MIRO can make mistakes. Verify important information.</p>
        </div>
      </div>

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} conversationTitle={conversation.title} messages={messages} />
      <CreateImageModal open={createImageOpen} onClose={() => setCreateImageOpen(false)} onImageCreated={handleImageCreated} />
    </div>
  );
};

export default GroupChatView;
