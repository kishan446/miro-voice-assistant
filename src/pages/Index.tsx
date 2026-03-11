import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ChatSidebar from "@/components/ChatSidebar";
import GroupChatView from "@/components/GroupChatView";
import InviteModal from "@/components/InviteModal";
import NewGroupModal from "@/components/NewGroupModal";
import MiroInterface from "@/components/MiroInterface";
import { useConversations } from "@/hooks/useConversations";
import { useChatMessages } from "@/hooks/useChatMessages";

const Index = () => {
  const navigate = useNavigate();
  const { conversations, loading: convsLoading, createConversation, deleteConversation, fetchConversations, inviteMember } = useConversations();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showMiroMode, setShowMiroMode] = useState(true); // Show old Miro interface when no conversation selected
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteTargetId, setInviteTargetId] = useState<string | null>(null);
  const [newGroupModalOpen, setNewGroupModalOpen] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const { messages, loading: msgsLoading, sendMessage } = useChatMessages(activeConversationId);

  // Fetch member count when active conversation changes
  useEffect(() => {
    if (!activeConversationId) return;
    supabase
      .from("conversation_members")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", activeConversationId)
      .then(({ count }) => setMemberCount(count || 0));
  }, [activeConversationId]);

  const handleNewChat = useCallback(async () => {
    const id = await createConversation("New Chat", false);
    if (id) {
      setActiveConversationId(id);
      setShowMiroMode(false);
    }
  }, [createConversation]);

  const handleNewGroupChat = useCallback(() => {
    setNewGroupModalOpen(true);
  }, []);

  const handleCreateGroup = useCallback(async (title: string) => {
    const id = await createConversation(title, true);
    if (id) {
      setActiveConversationId(id);
      setShowMiroMode(false);
    }
  }, [createConversation]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setShowMiroMode(false);
  }, []);

  const handleDeleteConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setShowMiroMode(true);
    }
  }, [deleteConversation, activeConversationId]);

  const handleInvite = useCallback((conversationId: string) => {
    setInviteTargetId(conversationId);
    setInviteModalOpen(true);
  }, []);

  const handleInviteSubmit = useCallback(async (email: string) => {
    if (!inviteTargetId) return false;
    return inviteMember(inviteTargetId, email);
  }, [inviteTargetId, inviteMember]);

  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut({ scope: "local" }); } catch {}
    navigate("/auth", { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ChatSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onNewGroupChat={handleNewGroupChat}
        onDeleteConversation={handleDeleteConversation}
        onInvite={handleInvite}
        onLogout={handleLogout}
        loading={convsLoading}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {showMiroMode || !activeConversation ? (
          <MiroInterface />
        ) : (
          <GroupChatView
            conversation={activeConversation}
            messages={messages}
            loading={msgsLoading}
            onSendMessage={sendMessage}
            isGroup={activeConversation.is_group}
            memberCount={memberCount}
          />
        )}
      </div>

      <InviteModal
        open={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        onInvite={handleInviteSubmit}
      />

      <NewGroupModal
        open={newGroupModalOpen}
        onClose={() => setNewGroupModalOpen(false)}
        onCreate={handleCreateGroup}
      />
    </div>
  );
};

export default Index;
