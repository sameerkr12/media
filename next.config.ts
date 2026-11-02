import type {NextConfig} from 'next';
const vpsConfig:NextConfig={
 output:'standalone',
 distDir:'.next-vps',
 outputFileTracingIncludes:{'/':['./content/home.html']},
 webpack(config){config.module.rules.push({resourceQuery:/raw/,type:'asset/source'});return config;},
};
const nextConfig:NextConfig={
 ...(process.env.EMPIREX_VPS_BUILD==='1'?vpsConfig:{}),
 poweredByHeader:false,
 async headers(){return [{source:'/:path*',headers:[{key:'X-Content-Type-Options',value:'nosniff'},{key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},{key:'X-Frame-Options',value:'DENY'}]}];},
};
export default nextConfig;
