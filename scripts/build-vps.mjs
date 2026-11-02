import {spawnSync} from 'node:child_process';
import {cpSync,mkdirSync} from 'node:fs';
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{stdio:'inherit',env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',EMPIREX_VPS_BUILD:'1'}});
if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
mkdirSync('.next-vps/standalone/.next-vps',{recursive:true});
cpSync('.next-vps/static','.next-vps/standalone/.next-vps/static',{recursive:true});
cpSync('public','.next-vps/standalone/public',{recursive:true});
cpSync('content','.next-vps/standalone/content',{recursive:true});
console.log('Standalone VPS bundle includes static assets and homepage content.');
