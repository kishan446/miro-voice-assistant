import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Users, Trash2, ChevronLeft, ChevronRight, UserPlus, LogOut } from "lucide-react";
import type { Conversation } from "@/hooks/useConversations";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onNewGroupChat: () => void;
  onDeleteConversation: (id: string) => void;
  onInvite: (conversationId: string) => void;
  onLogout: () => void;
  loading: boolean;
}

const ChatSidebar = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onNewGroupChat,
  onDeleteConversation,
  onInvite,
  onLogout,
  loading,
}: ChatSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      className="h-full flex flex-col bg-sidebar border-r border-sidebar-border relative"
      animate={{ width: collapsed ? 56 : 260 }}
      transition={{ duration: 0.2 }}
    >
      {/* Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-4 z-30 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Header */}
      <div className="p-3 flex flex-col gap-2">
        {!collapsed && (
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-display text-sm tracking-wider text-sidebar-foreground px-1 mb-1"
          >
            CHATS
          </motion.h2>
        )}
        <button
          onClick={onNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-foreground hover:bg-primary/20 transition-colors text-sm font-body"
          title="New AI Chat"
        >
          <Plus className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Chat</span>}
        </button>
        <button
          onClick={onNewGroupChat}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-sidebar-accent border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80 transition-colors text-sm font-body"
          title="New Group Chat"
        >
          <Users className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New Group</span>}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {loading ? (
          <div className="text-muted-foreground text-xs text-center py-4 font-body">Loading...</div>
        ) : conversations.length === 0 ? (
          !collapsed && (
            <div className="text-muted-foreground text-xs text-center py-8 font-body px-2">
              No conversations yet. Start a new chat!
            </div>
          )
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm font-body ${
                activeConversationId === conv.id
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              {conv.is_group ? (
                <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{conv.title}</span>
                  <div className="hidden group-hover:flex items-center gap-1">
                    {conv.is_group && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onInvite(conv.id); }}
                        className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                        title="Invite member"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                      className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom: Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors text-sm font-body"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;
