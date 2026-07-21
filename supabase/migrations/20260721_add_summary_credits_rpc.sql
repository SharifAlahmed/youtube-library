-- RPC to safely decrement summary credits (floors at 0)
CREATE OR REPLACE FUNCTION decrement_summary_credits(uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET summary_credits = GREATEST(0, summary_credits - 1)
  WHERE id = uid;
END;
$$;
