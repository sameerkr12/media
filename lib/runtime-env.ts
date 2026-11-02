// Native Node/VPS runtime. Vite aliases this module to the Worker adapter.
export const env={...process.env,AUTH_MODE:process.env.AUTH_MODE||'supabase'} as Cloudflare.Env;
