// Keep preview secrets out of the generated deployment directory.
import './sites-env.mjs';
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,existsSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawn} from 'node:child_process';
const root=process.cwd(),build=resolve(root,'dist/server'),runtime=resolve(root,'.sites-runtime/preview');
const config=JSON.parse(readFileSync(resolve(build,'wrangler.json'),'utf8'));
config.main=resolve(build,config.main);
if(config.assets?.directory)config.assets.directory=resolve(build,config.assets.directory);
mkdirSync(runtime,{recursive:true});
writeFileSync(resolve(runtime,'wrangler.json'),JSON.stringify(config));
const envFile=resolve(root,'.dev.vars'),target=resolve(runtime,'.dev.vars');
if(existsSync(envFile))copyFileSync(envFile,target);else rmSync(target,{force:true});
const child=spawn(process.execPath,[resolve(root,'node_modules/wrangler/bin/wrangler.js'),'dev','--config',resolve(runtime,'wrangler.json'),'--local','--ip','127.0.0.1','--inspector-port','0',...process.argv.slice(2)],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
