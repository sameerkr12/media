declare namespace Cloudflare {
 interface Env {
  BUCKET?: R2Bucket;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  SUPABASE_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
 }
}
