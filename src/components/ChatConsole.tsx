import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { useRef, useEffect } from "react";

export interface ChatAttachment {
  name: string;
  type: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
}

interface ChatConsoleProps {
  messages: ChatMessage[];
  isProcessing: boolean;
}

const ChatConsole = ({ messages, isProcessing }: ChatConsoleProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        ref={scrollRef}
        className="max-h-72 overflow-y-auto space-y-3 px-4 py-3"
      >
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg font-body text-sm ${
                  msg.role === "user"
                    ? "bg-primary/10 border border-primary/20 text-foreground"
                    : "bg-secondary border border-border text-foreground"
                }`}
              >
                {/* Show attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((att, i) =>
                      att.type.startsWith("image/") ? (
                        <img
                          key={i}
                          src={att.url}
                          alt={att.name}
                          className="max-w-[200px] max-h-[150px] rounded-md object-cover border border-border"
                        />
                      ) : (
                        <div
                          key={i}
                          className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 text-xs text-muted-foreground"
                        >
                          <span>📎</span>
                          <span className="truncate max-w-[150px]">{att.name}</span>
                        </div>
                      )
                    )}
                  </div>
                )}

                {msg.role === "user" ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_p]:text-foreground [&_strong]:text-primary [&_code]:text-primary [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-secondary border border-border px-4 py-2 rounded-lg flex gap-1">
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
    </div>
  );
};

export default ChatConsole;
