
-- Fix: Allow conversation creators to see their newly created conversations
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;

CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (
    public.is_conversation_member(auth.uid(), id)
    OR created_by = auth.uid()
  );
