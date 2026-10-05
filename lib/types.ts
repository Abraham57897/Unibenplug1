export type Campus = { id: number; name: string; slug: string; lat: number; lng: number; state: string | null; is_active: boolean };
export type Post = {
  id: string; user_id: string; campus_id: number; post_type: 'SELL' | 'NEED';
  title: string; description: string | null; price: string; category: string; area: string | null;
  lat: number | null; lng: number | null; image_url: string | null; whatsapp_link: string | null;
  views_count: number; status: string; created_at: string; expires_at: string;
  urgent_now?: boolean;
  seller_name?: string; seller_verified?: boolean; seller_rating?: number; seller_rating_count?: number;
};
export type Profile = {
  id: string; full_name: string | null; whatsapp_number: string | null; campus_id: number | null;
  is_admin: boolean; is_banned: boolean; is_verified: boolean; avg_rating: number;
};
