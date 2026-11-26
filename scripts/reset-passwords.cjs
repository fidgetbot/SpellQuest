// Operator-only. Read JSON [{username,password}] from stdin; never use CLI secrets.
const fs=require('node:fs'),db=require('../server/db');
(async()=>{const items=JSON.parse(fs.readFileSync(0,'utf8'));const count=await require('../server/accounts').resetPasswords(db,items);console.log('Passwords updated for '+count+' accounts; linked browser sessions revoked.');await db.end();})().catch(()=>{console.error('Password reset failed; check input and account names.');process.exit(1);});
