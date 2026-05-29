-- Run in Supabase SQL Editor after enabling RLS.
-- Your backend MUST use SUPABASE_SERVICE_ROLE_KEY (service_role JWT).
-- service_role bypasses RLS automatically; the policies below are explicit
-- and document intent. They do not replace fixing a wrong anon key in .env.

-- If payments still fail, confirm backend env (on the server running pm2):
--   echo $SUPABASE_SERVICE_ROLE_KEY | cut -d. -f2 | base64 -d 2>/dev/null | jq .role
-- should print "service_role"

-- Service role (backend API) — full access
CREATE POLICY IF NOT EXISTS "srole_payments" ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_orders" ON orders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_transactions" ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_order_items" ON order_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_order_addresses" ON order_addresses FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_cart_items" ON cart_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "srole_carts" ON carts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Optional: authenticated users read their own rows (Supabase client / future app)
CREATE POLICY IF NOT EXISTS "auth_orders_select" ON orders
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "auth_payments_select" ON payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = payments.order_id AND o.user_id = auth.uid()));
