import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  title: string;
  is_group: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  member_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { display_name: string | null; email: string | null; avatar_url: string | null };
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
      return;
    }
    setConversations((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(async (title: string, isGroup: boolean): Promise<string | null> => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("conversations")
      .insert({ title, is_group: isGroup, created_by: userId })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create conversation");
      console.error(error);
      return null;
    }

    const convId = (data as any).id;
    await supabase.from("conversation_members").insert({
      conversation_id: convId,
      user_id: userId,
      role: "owner",
    });

    await fetchConversations();
    return convId;
  }, [fetchConversations]);

  const deleteConversation = useCallback(async (id: string) => {
    const { error } = await supabase.from("conversations").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }
    setConversations(prev => prev.filter(c => c.id !== id));
  }, []);

  const renameConversation = useCallback(async (id: string, title: string) => {
    const { error } = await supabase.from("conversations").update({ title }).eq("id", id);
    if (error) {
      toast.error("Failed to rename conversation");
      return;
    }
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const getMembers = useCallback(async (conversationId: string): Promise<ConversationMember[]> => {
    const { data, error } = await supabase
      .from("conversation_members")
      .select("*, profile:profiles(display_name, email, avatar_url)")
      .eq("conversation_id", conversationId);

    if (error) {
      console.error("Error fetching members:", error);
      return [];
    }
    return (data as any[]) || [];
  }, []);

  const inviteMember = useCallback(async (conversationId: string, email: string): Promise<boolean> => {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (profileError || !profile) {
      toast.error("User not found. They must have a MIRO account first.");
      return false;
    }

    const userId = (profile as any).id;
    const { error } = await supabase.from("conversation_members").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "member",
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("User is already in this conversation");
      } else {
        toast.error("Failed to invite user");
        console.error(error);
      }
      return false;
    }

    toast.success("User invited successfully!");
    return true;
  }, []);

  return { conversations, loading, createConversation, deleteConversation, renameConversation, fetchConversations, getMembers, inviteMember };
}
