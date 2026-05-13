export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type UserRole = "user" | "seller" | "admin";
type ProductStatus = "draft" | "published" | "archived";
type PaymentVerificationStatus = "pending_verification" | "verified" | "rejected" | "needs_recheck";
type ProviderTagStatus = "none" | "pending" | "approved" | "rejected";
type FeaturedSlotStatus = "available" | "active" | "expired" | "cancelled";
type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";
type ProductMediaType = "image" | "youtube";

type Table<Row> = { Row: Row; Insert: Partial<Row>; Update: Partial<Row>; Relationships: [] };

export type Database = {
  public: {
    Enums: {
      user_role: UserRole;
      product_status: ProductStatus;
      payment_verification_status: PaymentVerificationStatus;
      provider_tag_status: ProviderTagStatus;
      featured_slot_status: FeaturedSlotStatus;
      subscription_status: SubscriptionStatus;
    };
    Tables: {
      profiles: Table<{ id: string; email: string | null; display_name: string | null; role: UserRole; created_at: string; updated_at: string }>;
      sellers: Table<{ id: string; profile_id: string; seller_name: string; provider_tag_status: ProviderTagStatus; website_url: string | null; discord_handle: string | null; telegram_handle: string | null; created_at: string; updated_at: string }>;
      products: Table<{ id: string; seller_id: string; slug: string; name: string; game: string; category: string; status: ProductStatus; website_url: string | null; summary: string | null; features: string[]; price_points: string[]; trust_score: number | null; created_at: string; updated_at: string }>;
      product_media: Table<{ id: string; product_id: string; storage_path: string | null; public_url: string | null; alt_text: string | null; sort_order: number; media_type: ProductMediaType; external_url: string | null; provider: string | null; video_id: string | null; thumbnail_url: string | null; title: string | null; created_at: string }>;
      payment_methods: Table<{ id: string; name: string; slug: string; created_at: string }>;
      seller_payment_methods: Table<{ id: string; seller_id: string; payment_method_id: string; status: PaymentVerificationStatus; processor: string | null; checkout_url: string | null; refund_policy_url: string | null; verified_at: string | null; expires_at: string | null; created_at: string; updated_at: string }>;
      payment_verification_requests: Table<{ id: string; seller_id: string; product_id: string | null; payment_method_id: string; status: PaymentVerificationStatus; proof_screenshot_path: string | null; proof_document_path: string | null; external_proof_url: string | null; seller_notes: string | null; admin_notes: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string }>;
      provider_tag_requests: Table<{ id: string; seller_id: string; status: ProviderTagStatus; website_url: string | null; discord_handle: string | null; telegram_handle: string | null; proof_url: string | null; seller_notes: string | null; admin_notes: string | null; reviewed_by: string | null; reviewed_at: string | null; created_at: string; updated_at: string }>;
      trust_signals: Table<{ id: string; seller_id: string | null; product_id: string | null; label: string; description: string | null; is_public: boolean; created_at: string }>;
      featured_slots: Table<{ id: string; game: string; category: string; product_id: string | null; seller_id: string | null; status: FeaturedSlotStatus; starts_at: string | null; ends_at: string | null; stripe_checkout_session_id: string | null; created_at: string; updated_at: string }>;
      stripe_customers: Table<{ id: string; profile_id: string; stripe_customer_id: string; created_at: string; updated_at: string }>;
      subscriptions: Table<{ id: string; seller_id: string; stripe_subscription_id: string | null; status: SubscriptionStatus; current_period_end: string | null; created_at: string; updated_at: string }>;
      admin_actions: Table<{ id: string; admin_profile_id: string; action_type: string; target_table: string; target_id: string | null; notes: string | null; metadata: Json; created_at: string }>;
      saved_products: Table<{ id: string; profile_id: string; product_id: string; created_at: string }>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
