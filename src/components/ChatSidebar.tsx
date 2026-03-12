import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageSquare, Users, Trash2, ChevronLeft, ChevronRight, UserPlus, LogOut, MoreHorizontal, Edit2, Check, X } from "lucide-react";
import type { Conversation } from "@/hooks/useConversations";

interface ChatSidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onNewGroupChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
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
  onRenameConversation,
  onInvite,
  onLogout,
  loading,
}: ChatSidebarProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const confirmEdit = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Group conversations: today, yesterday, previous 7 days, older
  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const week = new Date(today.getTime() - 7 * 86400000);

    const groups: { label: string; items: Conversation[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "Previous 7 Days", items: [] },
      { label: "Older", items: [] },
    ];

    conversations.forEach((c) => {
      const d = new Date(c.updated_at || c.created_at);
      if (d >= today) groups[0].items.push(c);
      else if (d >= yesterday) groups[1].items.push(c);
      else if (d >= week) groups[2].items.push(c);
      else groups[3].items.push(c);
    });

    return groups.filter((g) => g.items.length > 0);
  };

  const groups = groupConversations();

  return (
    <motion.div
      className="h-full flex flex-col bg-sidebar relative select-none"
      animate={{ width: collapsed ? 56 : 280 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
    >
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-5 z-30 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* New chat buttons */}
      <div className="p-3 space-y-1.5">
        <button
          onClick={onNewChat}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-border text-foreground hover:bg-secondary/80 transition-all text-sm font-body group"
          title="New AI Chat"
        >
          <Plus className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
          {!collapsed && <span className="font-medium">New chat</span>}
        </button>
        <button
          onClick={onNewGroupChat}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all text-sm font-body group"
          title="New Group Chat"
        >
          <Users className="w-4 h-4 shrink-0" />
          {!collapsed && <span>New group</span>}
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col gap-2 px-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          !collapsed && (
            <div className="text-muted-foreground text-xs text-center py-12 font-body px-4 leading-relaxed">
              No conversations yet.
              <br />
              Start a new chat to begin!
            </div>
          )
        ) : (
          groups.map((group) => (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 py-1.5 font-body">
                  {group.label}
                </p>
              )}
              {group.items.map((conv) => {
                const isActive = activeConversationId === conv.id;
                const isEditing = editingId === conv.id;
                const isHovered = hoveredId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`group relative flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm font-body mb-0.5 ${
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-sidebar-foreground/70 hover:bg-secondary/50 hover:text-foreground"
                    }`}
                    onClick={() => !isEditing && onSelectConversation(conv.id)}
                    onMouseEnter={() => setHoveredId(conv.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    {conv.is_group ? (
                      <Users className="w-4 h-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <MessageSquare className="w-4 h-4 shrink-0 text-muted-foreground" />
                    )}

                    {!collapsed && (
                      <>
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") confirmEdit(conv.id);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="flex-1 bg-background border border-border rounded px-2 py-0.5 text-sm text-foreground focus:outline-none focus:border-primary"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); confirmEdit(conv.id); }}
                              className="p-0.5 text-primary hover:text-foreground"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 truncate">{conv.title}</span>

                            {/* Action buttons - visible on hover or active */}
                            <AnimatePresence>
                              {(isHovered || isActive) && (
                                <motion.div
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex items-center gap-0.5"
                                >
                                  <button
                                    onClick={(e) => { e.stopPropagation(); startEditing(conv); }}
                                    className="p-1 rounded hover:bg-background/50 text-muted-foreground hover:text-foreground transition-colors"
                                    title="Rename"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
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
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom: Sign Out */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all text-sm font-body"
          title="Sign out"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </motion.div>
  );
};

export default ChatSidebar;
