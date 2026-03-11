import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, X, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DBChatMessage } from "@/hooks/useChatMessages";
import type { Conversation } from "@/hooks/useConversations";

interface GroupChatViewProps {
  conversation: Conversation | null;
  messages: DBChatMessage[];
  loading: boolean;
  onSendMessage: (content: string, type?: "user" | "assistant" | "system", attachments?: any[]) => Promise<any>;
  isGroup: boolean;
  memberCount?: number;
}

const GroupChatView = ({ conversation, messages, loading, onSendMessage, isGroup, memberCount }: GroupChatViewProps) => {
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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
  }, [messages]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = textInput.trim();
    if (!text || sending) return;
    setSending(true);
    setTextInput("");

    await onSendMessage(text, "user");

    // If not a group chat, trigger AI response
    if (!isGroup) {
      setIsProcessing(true);
      try {
        // Get recent messages for context
        const recentMsgs = messages.slice(-6).map(m => ({
          role: m.message_type === "assistant" ? "assistant" : "user",
          content: m.content,
        }));
        recentMsgs.push({ role: "user", content: text });

        const result = await supabase.functions.invoke("miro-chat", {
          body: { query: text, messages: recentMsgs },
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

  const getSenderName = (msg: DBChatMessage) => {
    if (msg.message_type === "assistant") return "MIRO";
    if (msg.message_type === "system") return "System";
    const profile = msg.sender_profile as any;
    if (profile?.display_name) return profile.display_name;
    if (profile?.email) return profile.email.split("@")[0];
    return "User";
  };

  const isOwnMessage = (msg: DBChatMessage) => msg.sender_id === currentUserId;

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground font-body gap-4">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <Users className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <p className="text-lg">Select a conversation or start a new one</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-card/50 backdrop-blur-sm">
        {isGroup ? <Users className="w-5 h-5 text-primary" /> : null}
        <div>
          <h2 className="font-display text-sm tracking-wider text-foreground">{conversation.title}</h2>
          {isGroup && memberCount && (
            <p className="text-xs text-muted-foreground font-body">{memberCount} members</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-muted-foreground text-sm text-center font-body py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground text-sm text-center font-body py-8">
            {isGroup ? "Start chatting with your group!" : "Start a conversation with MIRO!"}
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg) => {
              const own = isOwnMessage(msg);
              const isAssistant = msg.message_type === "assistant";
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${own && !isAssistant ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm font-body ${
                      isAssistant
                        ? "bg-secondary border border-border text-foreground"
                        : own
                        ? "bg-primary/10 border border-primary/20 text-foreground"
                        : "bg-card border border-border text-foreground"
                    }`}
                  >
                    {(isGroup || isAssistant) && (
                      <p className={`text-xs font-semibold mb-1 ${isAssistant ? "text-primary" : "text-muted-foreground"}`}>
                        {getSenderName(msg)}
                      </p>
                    )}
                    {isAssistant ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_p]:text-foreground [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="bg-secondary border border-border px-4 py-2 rounded-xl flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-primary"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border bg-card/30">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={isGroup ? "Type a message..." : "Ask MIRO anything..."}
            disabled={sending || isProcessing}
            className="flex-1 bg-secondary/40 border border-border rounded-lg px-4 py-2.5 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          <button
            type="submit"
            disabled={sending || isProcessing || !textInput.trim()}
            className="bg-primary/20 hover:bg-primary/30 border border-primary/50 rounded-lg px-4 py-2.5 text-primary transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupChatView;
