import {pathToFileURL} from 'node:url';
export function validateVpsEnvironment(env){
 const errors=[];
 const required=['APP_URL','ADMIN_EMAIL','ADMIN_PASSWORD','SUPABASE_URL'];
 for(const name of required)if(!env[name]||env[name].includes('replace-with')||env[name].includes('example.com')||env[name].includes('your-project'))errors.push('Set '+name+' to a real value.');
 if(env.AUTH_MODE!=='supabase')errors.push('AUTH_MODE must be supabase on a VPS.');
 try{const url=new URL(env.APP_URL);if(env.SITE_DOMAIN&&url.host!==env.SITE_DOMAIN)errors.push('APP_URL must match SITE_DOMAIN.');if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)errors.push('APP_URL must be the HTTPS site origin.');}catch{errors.push('APP_URL must be a valid HTTPS origin.');}
 try{if(new URL(env.SUPABASE_URL).protocol!=='https:')errors.push('SUPABASE_URL must use HTTPS.');}catch{errors.push('SUPABASE_URL is invalid.');}
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ADMIN_EMAIL||'')||env.ADMIN_EMAIL?.endsWith('@sites.test'))errors.push('Use your confirmed Supabase Auth email as ADMIN_EMAIL.');
 if((env.ADMIN_PASSWORD||'').length<12||env.ADMIN_PASSWORD.length>256)errors.push('ADMIN_PASSWORD must contain 12–256 characters.');
 const secret=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'';
 if(!secret.startsWith('sb_secret_')){try{if(JSON.parse(Buffer.from(secret.split('.')[1],'base64url')).role!=='service_role')throw Error();}catch{errors.push('Set a Supabase secret or service-role key.');}}
 if(!(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY)||/replace-with/.test(env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY))errors.push('Set the Supabase publishable/anon key for sign-in.');
 return errors;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const errors=validateVpsEnvironment(process.env);if(errors.length){console.error('VPS configuration incomplete:\n'+errors.join('\n'));process.exit(1);}console.log('VPS environment validated.');
}
