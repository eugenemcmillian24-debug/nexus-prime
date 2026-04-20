-- 016_pay_to_play_enforcement.sql
-- Deprecate free tier and remove automatic credit awards

-- 1. Update existing 'Free' users to 'Starter' (or force them to pay later, but this keeps the system consistent)
-- For now, we just ensure no NEW user gets 'Free' tier.
ALTER TABLE public.user_credits ALTER COLUMN tier SET DEFAULT 'Starter';

-- 2. Update default balance to 0 for new users (No free credits)
ALTER TABLE public.user_credits ALTER COLUMN balance SET DEFAULT 0;

-- 3. Update the generate_referral_code function to NOT award free credits to the referred user automatically
-- or reduce the bonus. User wants "All users must pay".
CREATE OR REPLACE FUNCTION public.complete_referral(p_referral_code TEXT, p_new_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_referral_id UUID;
  bonus INTEGER := 0; -- DISABLED AUTOMATIC REFERRAL CREDITS
BEGIN
  SELECT referrer_id, id INTO v_referrer_id, v_referral_id
  FROM public.referrals
  WHERE referral_code = p_referral_code AND status = 'pending'
  LIMIT 1;

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired referral code');
  END IF;

  -- Update referral record (just for tracking)
  UPDATE public.referrals SET
    referred_id = p_new_user_id,
    status = 'completed',
    credits_awarded_referrer = 0,
    credits_awarded_referred = 0,
    completed_at = now()
  WHERE id = v_referral_id;

  -- Update profile
  UPDATE public.profiles SET referred_by = v_referrer_id WHERE id = p_new_user_id;

  RETURN jsonb_build_object('success', true, 'credits_awarded', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
