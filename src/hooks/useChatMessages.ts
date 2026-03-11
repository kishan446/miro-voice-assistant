import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DBChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  message_type: "user" | "assistant" | "system";
  attachments: any[];
  created_at: string;
  sender_profile?: { display_name: string | null; email: string | null };
}

export function useChatMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<DBChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const channelRef = useRef<any>(null);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    // Try with profile join first, fallback to plain query
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      console.error("Error fetching messages:", error);
      const { data: fallback } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(200);
      setMessages((fallback as any[]) || []);
    } else {
      setMessages((data as any[]) || []);
    }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    channelRef.current = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload: any) => {
          const newMsg = payload.new as any;
          // Fetch sender profile
          if (newMsg.sender_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, email")
              .eq("id", newMsg.sender_id)
              .single();
            newMsg.sender_profile = profile;
          }
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  const sendMessage = useCallback(async (content: string, messageType: "user" | "assistant" | "system" = "user", attachments?: any[]) => {
    if (!conversationId) return null;

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: messageType === "assistant" ? null : userId,
        content,
        message_type: messageType,
        attachments: attachments || [],
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return null;
    }

    // Update conversation updated_at
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return data;
  }, [conversationId]);

  return { messages, loading, sendMessage, fetchMessages };
}
