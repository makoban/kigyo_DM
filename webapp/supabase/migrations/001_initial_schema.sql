-- ============================================================
-- 起業サーチDM営業サービス - 初期スキーマ
-- ============================================================

-- 1. profiles: ユーザー情報（auth.usersの拡張）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  -- 送り主情報
  company_name TEXT,
  company_url TEXT,
  company_description TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  contact_email TEXT,
  representative_name TEXT,
  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_payment_method_id TEXT,
  -- メタ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. subscriptions: エリア設定 + 月額上限 + 挨拶文
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- エリア設定
  prefecture TEXT NOT NULL,
  city TEXT,
  area_label TEXT NOT NULL, -- 表示用: "愛知県 名古屋市天白区"
  -- 上限
  monthly_budget_limit INTEGER NOT NULL DEFAULT 10000, -- 円
  max_letters_per_month INTEGER GENERATED ALWAYS AS (monthly_budget_limit / 380) STORED,
  -- 挨拶文
  greeting_text TEXT,
  -- ステータス
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. corporations: 国税庁CSVから取得した法人データ
CREATE TABLE corporations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  corporate_number TEXT NOT NULL UNIQUE, -- 法人番号（13桁）
  process_type TEXT NOT NULL, -- 処理区分: 01=新規, 11=商号変更, etc.
  company_name TEXT NOT NULL,
  company_name_kana TEXT,
  entity_type TEXT, -- 301=株式会社, 305=合同会社
  prefecture TEXT,
  city TEXT,
  street_address TEXT,
  prefecture_code TEXT,
  city_code TEXT,
  postal_code TEXT,
  change_date DATE, -- 変更年月日
  update_date DATE, -- 更新年月日
  csv_date DATE NOT NULL, -- CSV発行日
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corporations_csv_date ON corporations(csv_date);
CREATE INDEX idx_corporations_area ON corporations(prefecture, city);
CREATE INDEX idx_corporations_process ON corporations(process_type);

-- 4. mailing_queue: 投函キュー
CREATE TABLE mailing_queue (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  corporation_id BIGINT NOT NULL REFERENCES corporations(id),
  -- ステータス: pending → confirmed → ready_to_send → sent / cancelled
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready_to_send', 'sent', 'cancelled')),
  -- 投函予定日
  scheduled_date DATE NOT NULL,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  unit_price INTEGER NOT NULL DEFAULT 380,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_user_status ON mailing_queue(user_id, status);
CREATE INDEX idx_queue_scheduled ON mailing_queue(scheduled_date, status);
CREATE INDEX idx_queue_billing ON mailing_queue(user_id, status, scheduled_date);

-- 5. monthly_usage: 月次使用量サマリ
CREATE TABLE monthly_usage (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- 'YYYY-MM'
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_amount INTEGER NOT NULL DEFAULT 0, -- 円
  -- Stripe決済
  stripe_invoice_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'invoiced', 'paid', 'failed')),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

-- 6. batch_logs: バッチ実行ログ
CREATE TABLE batch_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_type TEXT NOT NULL, -- 'fetch_corporations', 'lock_queue', 'monthly_billing'
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  csv_date DATE,
  total_records INTEGER DEFAULT 0,
  new_companies INTEGER DEFAULT 0,
  matched_subscriptions INTEGER DEFAULT 0,
  queued_count INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- トリガー: updated_at の自動更新
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_mailing_queue_updated
  BEFORE UPDATE ON mailing_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_monthly_usage_updated
  BEFORE UPDATE ON monthly_usage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- トリガー: auth.users 登録時に profiles を自動作成
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporations ENABLE ROW LEVEL SECURITY;
ALTER TABLE mailing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_logs ENABLE ROW LEVEL SECURITY;

-- profiles: 自分のみ読み書き
CREATE POLICY profiles_select ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

-- subscriptions: 自分のサブスクリプションのみ
CREATE POLICY subs_select ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY subs_insert ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY subs_update ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY subs_delete ON subscriptions FOR DELETE USING (auth.uid() = user_id);

-- corporations: 全ユーザーが読み取り可（公開データ）
CREATE POLICY corps_select ON corporations FOR SELECT USING (true);

-- mailing_queue: 自分のキューのみ
CREATE POLICY queue_select ON mailing_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY queue_update ON mailing_queue FOR UPDATE USING (auth.uid() = user_id);

-- monthly_usage: 自分の利用量のみ
CREATE POLICY usage_select ON monthly_usage FOR SELECT USING (auth.uid() = user_id);

-- batch_logs: 全ユーザーが読み取り可（参考情報）
CREATE POLICY batch_select ON batch_logs FOR SELECT USING (true);
