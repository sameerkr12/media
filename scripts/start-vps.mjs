import {validateVpsEnvironment} from './validate-vps-env.mjs';
import {spawn} from 'node:child_process';
const errors=validateVpsEnvironment(process.env);if(errors.length){console.error(errors.join('\n'));process.exit(1);}
const child=spawn(process.execPath,['.next-vps/standalone/server.js'],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:process.env.PORT||'3000'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exit(1);});
child.on('exit',code=>process.exit(code??1));
