import fs from 'node:fs';
const file='.env.local';
if(fs.existsSync(file))for(const line of fs.readFileSync(file,'utf8').split(/\r?\n/)){const match=line.match(/^([A-Z0-9_]+)=(.*)$/);if(match&&!process.env[match[1]])process.env[match[1]]=match[2].replace(/^['"]|['"]$/g,'');}
const needed=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','NEXT_PUBLIC_SITE_URL'];
let valid=true;
for(const key of needed){const present=Boolean(process.env[key]);console.log(`${present?'OK':'MISSING'} ${key}`);if(!present)valid=false;}
if(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_secret_')){console.error('ERROR: a secret key must never be used as a public key.');valid=false;}
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(key?.startsWith('eyJ')){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role==='service_role'){console.error('ERROR: service_role is forbidden in NEXT_PUBLIC_* variables.');valid=false;}}catch{console.error('ERROR: API key format is invalid.');valid=false;}}
for(const name of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SITE_URL']){const raw=process.env[name];if(!raw)continue;try{const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw Error();if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error();}catch{console.error(`ERROR: ${name} must be an HTTPS origin (or localhost for development).`);valid=false;}}
if(!valid)process.exitCode=1;
