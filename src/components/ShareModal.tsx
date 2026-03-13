import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, MessageCircle, Linkedin, Twitter, Facebook, Mail, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  conversationTitle: string;
  messages: { content: string; message_type: string; created_at: string }[];
}

const ShareModal = ({ open, onClose, conversationTitle, messages }: ShareModalProps) => {
  const [copied, setCopied] = useState(false);

  const formatConversation = () => {
    const header = `📝 *${conversationTitle}*\n${"─".repeat(30)}\n\n`;
    const body = messages
      .map((m) => {
        const role = m.message_type === "assistant" ? "🤖 MIRO" : m.message_type === "system" ? "⚙️ System" : "👤 You";
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return `${role} (${time}):\n${m.content}`;
      })
      .join("\n\n");
    return header + body + `\n\n— Shared from MIRO AI Assistant`;
  };

  const conversationText = formatConversation();
  const encodedText = encodeURIComponent(conversationText);
  const shortText = encodeURIComponent(`Check out my conversation "${conversationTitle}" on MIRO AI Assistant!`);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(conversationText);
      setCopied(true);
      toast.success("Conversation copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "text-green-500",
      bg: "bg-green-500/10 hover:bg-green-500/20",
      onClick: () => window.open(`https://wa.me/?text=${encodedText}`, "_blank"),
    },
    {
      name: "Twitter / X",
      icon: Twitter,
      color: "text-sky-400",
      bg: "bg-sky-400/10 hover:bg-sky-400/20",
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${shortText}`, "_blank"),
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "text-blue-500",
      bg: "bg-blue-500/10 hover:bg-blue-500/20",
      onClick: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`, "_blank"),
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "text-blue-600",
      bg: "bg-blue-600/10 hover:bg-blue-600/20",
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?quote=${shortText}`, "_blank"),
    },
    {
      name: "Email",
      icon: Mail,
      color: "text-orange-400",
      bg: "bg-orange-400/10 hover:bg-orange-400/20",
      onClick: () => window.open(`mailto:?subject=${encodeURIComponent(`MIRO Chat: ${conversationTitle}`)}&body=${encodedText}`, "_blank"),
    },
    {
      name: "Copy Link",
      icon: Link2,
      color: "text-muted-foreground",
      bg: "bg-secondary hover:bg-secondary/80",
      onClick: handleCopyLink,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="font-display text-sm tracking-wider text-foreground">SHARE CONVERSATION</h3>
                <p className="text-xs text-muted-foreground font-body mt-0.5 truncate max-w-[280px]">{conversationTitle}</p>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Share options grid */}
            <div className="p-5 grid grid-cols-3 gap-3">
              {shareOptions.map((opt) => (
                <button
                  key={opt.name}
                  onClick={opt.onClick}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-border ${opt.bg} transition-all active:scale-95`}
                >
                  <opt.icon className={`w-6 h-6 ${opt.color}`} />
                  <span className="text-[11px] font-body text-foreground font-medium">{opt.name}</span>
                </button>
              ))}
            </div>

            {/* Copy full text */}
            <div className="px-5 pb-5">
              <button
                onClick={handleCopyText}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary transition-all active:scale-[0.98] font-body text-sm font-medium"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Copied!" : "Copy Full Conversation"}
              </button>
              <p className="text-[10px] text-muted-foreground/50 text-center mt-2 font-body">
                {messages.length} message{messages.length !== 1 ? "s" : ""} will be shared
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ShareModal;
