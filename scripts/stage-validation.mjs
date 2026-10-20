// Use an OS temp volume to validate on Windows filesystems without readlink.
// Credentials and existing build output are deliberately excluded.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
const root=fs.realpathSync('.');
const staged=fs.mkdtempSync(path.join(os.tmpdir(),'tsuri-record-validation-'));
for(const entry of fs.readdirSync(root)){
 if(['.git','.next','node_modules'].includes(entry)||entry.startsWith('.env')||entry.endsWith('.tsbuildinfo')||entry.endsWith('.log'))continue;
 fs.cpSync(path.join(root,entry),path.join(staged,entry),{recursive:true});
}
fs.cpSync(path.join(root,'node_modules'),path.join(staged,'node_modules'),{recursive:true});
console.log(JSON.stringify({validation_path:staged,source_path:root}));
