export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  company_name: string | null;
  company_url: string | null;
  company_description: string | null;
  postal_code: string | null;
  address: string | null;
  phone: string | null;
  contact_email: string | null;
  representative_name: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_subscription_id: string | null;
  balance: number;
  plan_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  prefecture: string;
  city: string | null;
  area_label: string;
  monthly_budget_limit: number;
  max_letters_per_month: number;
  greeting_text: string | null;
  shoken_data: Record<string, unknown> | null;
  status: "active" | "paused" | "cancelled";
  created_at: string;
  updated_at: string;
}

export interface Corporation {
  id: number;
  corporate_number: string;
  process_type: string;
  company_name: string;
  company_name_kana: string | null;
  entity_type: string | null;
  prefecture: string | null;
  city: string | null;
  street_address: string | null;
  prefecture_code: string | null;
  city_code: string | null;
  postal_code: string | null;
  change_date: string | null;
  update_date: string | null;
  csv_date: string;
  created_at: string;
}

export interface MailingQueueItem {
  id: number;
  subscription_id: string;
  user_id: string;
  corporation_id: number;
  status: "pending" | "confirmed" | "ready_to_send" | "sent" | "cancelled";
  scheduled_date: string;
  sent_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  unit_price: number;
  balance_deducted: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  corporation?: Corporation;
}

export interface MonthlyUsage {
  id: number;
  user_id: string;
  year_month: string;
  total_sent: number;
  total_amount: number;
  stripe_invoice_id: string | null;
  payment_status: "pending" | "invoiced" | "paid" | "failed" | "charged";
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchLog {
  id: number;
  batch_type: string;
  status: "running" | "completed" | "failed";
  csv_date: string | null;
  total_records: number;
  new_companies: number;
  matched_subscriptions: number;
  queued_count: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}
