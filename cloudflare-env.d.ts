declare namespace Cloudflare {
 interface Env {
  BUCKET?: R2Bucket;
  AUTH_MODE?: 'supabase'|'platform';
  APP_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
 }
}
