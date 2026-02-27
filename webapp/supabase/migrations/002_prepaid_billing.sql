-- ============================================================
-- プリペイドチャージ型課金への移行
-- ============================================================

-- profiles: 残高・Subscription情報を追加
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_amount INTEGER NOT NULL DEFAULT 7600;

-- mailing_queue: 残高精算済みフラグ
ALTER TABLE mailing_queue ADD COLUMN IF NOT EXISTS balance_deducted BOOLEAN NOT NULL DEFAULT FALSE;

-- monthly_usage: チャージ記録にも使えるよう payment_status に 'charged' を追加
ALTER TABLE monthly_usage DROP CONSTRAINT IF EXISTS monthly_usage_payment_status_check;
ALTER TABLE monthly_usage ADD CONSTRAINT monthly_usage_payment_status_check
  CHECK (payment_status IN ('pending', 'invoiced', 'paid', 'failed', 'charged'));
