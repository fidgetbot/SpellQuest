// Operator-only: generated password goes to a private file, never stdout/arguments.
const fs=require('node:fs'),crypto=require('node:crypto');
const db=require('../server/db'),{tx}=require('../server/app'),passwords=require('../server/passwords');
(async()=>{
 const [player,name,role,out]=process.argv.slice(2);
 if(!player||!name||!['player','parent'].includes(role)||!out)throw Error('Use playerId name player|parent privateOutputFile');
 const username=passwords.username(name);if(!/^[a-z0-9_-]{1,40}$/.test(username))throw Error('Invalid name');
 const password=crypto.randomBytes(12).toString('hex').match(/.{6}/g).join('-'),encoded=await passwords.encode(password);
 const fd=fs.openSync(out,'wx',0o600);
 try{await tx(db,async c=>{
  await c.query('INSERT INTO login_accounts(username,display_name,player_id,supervisor,password_hash) VALUES($1,$2,$3,$4,$5)',[username,name,player,role==='parent',encoded]);
  if(role==='player')await c.query('UPDATE players SET nickname=$2 WHERE id=$1',[player,name]);
  await c.query('UPDATE browser_sessions SET revoked=true WHERE player_id=$1',[player]);
  await c.query('UPDATE setup_tokens SET expires_at=now() WHERE player_id=$1',[player]);
  fs.writeFileSync(fd,JSON.stringify({username:name,password,url:process.env.APP_ORIGIN+'/login'}));
 });}finally{fs.closeSync(fd);}
 console.log('Login created; password written to private file. Previous browser sessions revoked.');await db.end();
})().catch(e=>{console.error('Login creation failed:',e.message);process.exit(1);});
