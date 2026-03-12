
-- 1. Create a security definer function to check membership (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_member(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- 2. Create a function to check conversation role
CREATE OR REPLACE FUNCTION public.has_conversation_role(_user_id uuid, _conversation_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE user_id = _user_id AND conversation_id = _conversation_id AND role = ANY(_roles)
  )
$$;

-- 3. Drop all existing problematic policies
DROP POLICY IF EXISTS "Members can view members" ON public.conversation_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.conversation_members;
DROP POLICY IF EXISTS "Owners/admins can add members" ON public.conversation_members;
DROP POLICY IF EXISTS "Members can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Owners can delete conversations" ON public.conversations;
DROP POLICY IF EXISTS "Owners can update conversations" ON public.conversations;

-- 4. Recreate conversation_members policies using security definer function
CREATE POLICY "Members can view conversation members"
  ON public.conversation_members FOR SELECT TO authenticated
  USING (public.is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Owners and admins can add members"
  ON public.conversation_members FOR INSERT TO authenticated
  WITH CHECK (
    public.has_conversation_role(auth.uid(), conversation_id, ARRAY['owner', 'admin'])
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners can remove or self-leave"
  ON public.conversation_members FOR DELETE TO authenticated
  USING (
    public.has_conversation_role(auth.uid(), conversation_id, ARRAY['owner'])
    OR user_id = auth.uid()
  );

-- 5. Recreate conversations policies using security definer function
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.is_conversation_member(auth.uid(), id));

CREATE POLICY "Auth users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners can update conversations"
  ON public.conversations FOR UPDATE TO authenticated
  USING (public.has_conversation_role(auth.uid(), id, ARRAY['owner']));

CREATE POLICY "Owners can delete conversations"
  ON public.conversations FOR DELETE TO authenticated
  USING (public.has_conversation_role(auth.uid(), id, ARRAY['owner']));

-- 6. Recreate chat_messages policies using security definer function
CREATE POLICY "Members can view messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (public.is_conversation_member(auth.uid(), conversation_id));

CREATE POLICY "Members can send messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.is_conversation_member(auth.uid(), conversation_id)
  );
