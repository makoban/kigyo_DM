-- JPG URL columns for pre-rendered A4 images stored on Cloudflare R2
ALTER TABLE mailing_queue ADD COLUMN IF NOT EXISTS greeting_jpg_url TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS shoken_jpg_url TEXT;
