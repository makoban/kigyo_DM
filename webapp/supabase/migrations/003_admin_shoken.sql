-- subscriptions: 商圏レポートデータを保存 (Gemini + e-Stat JSON)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS shoken_data JSONB;
