'use strict';
const passwords=require('./passwords'),{tx,hash}=require('./app');
async function resetPasswords(db,items){
 if(!Array.isArray(items)||!items.length)throw Error('An account list is required');
 const updates=[];
 for(const item of items){const username=passwords.username(item.username);if(!username)throw Error('Account name required');updates.push({username,encoded:await passwords.encode(item.password)});}
 await tx(db,async c=>{
  for(const item of updates){
   const account=(await c.query('SELECT player_id FROM login_accounts WHERE username=$1 FOR UPDATE',[item.username])).rows[0];
   if(!account)throw Error('Account not found');
   await c.query('UPDATE login_accounts SET password_hash=$2 WHERE username=$1',[item.username,item.encoded]);
   await c.query('UPDATE browser_sessions SET revoked=true WHERE player_id=$1',[account.player_id]);
   await c.query('UPDATE setup_tokens SET expires_at=now() WHERE player_id=$1',[account.player_id]);
   await c.query('DELETE FROM rate_limits WHERE key=$1',['login-account:'+hash(item.username)]);
  }
 });
 return updates.length;
}
module.exports={resetPasswords};
