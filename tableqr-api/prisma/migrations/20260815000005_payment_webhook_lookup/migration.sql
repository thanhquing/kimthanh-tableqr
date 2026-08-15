-- A signed provider webhook is not authenticated as a restaurant. It can only
-- look up one payment by its globally unique payment code; every mutation then
-- runs again under that payment's restaurant context.
CREATE POLICY payment_webhook_code_lookup_policy ON "payment"
  FOR SELECT
  USING ("payment_code" = NULLIF(current_setting('app.payment_code', true), ''));
