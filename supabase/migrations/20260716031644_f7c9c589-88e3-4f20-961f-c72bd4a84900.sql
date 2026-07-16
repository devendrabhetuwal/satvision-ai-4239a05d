DROP POLICY IF EXISTS "Anyone can view shares by link" ON public.timeseries_shares;
REVOKE SELECT ON public.timeseries_shares FROM anon;
CREATE POLICY "Owners can view their shares" ON public.timeseries_shares FOR SELECT TO authenticated USING (auth.uid() = user_id);