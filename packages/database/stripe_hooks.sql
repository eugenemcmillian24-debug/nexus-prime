-- Credit Purchase History for Billing (Stripe Integration Ready)
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  amount_usd DECIMAL(10, 2) NOT NULL,
  credits_added INTEGER NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, succeeded, failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Function to handle Stripe Webhook (called via Edge Function)
-- Logic: When a payment succeeds, add credits to the user_credits table.
CREATE OR REPLACE FUNCTION handle_successful_payment()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_credits
  SET balance = balance + NEW.credits_added,
      updated_at = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER on_credit_purchase_success
AFTER UPDATE OF status ON credit_purchases
FOR EACH ROW
WHEN (NEW.status = 'succeeded' AND OLD.status = 'pending')
EXECUTE PROCEDURE handle_successful_payment();
