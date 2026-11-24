// Run with Railway-injected DATABASE_URL. Credentials are written to a private file, never stdout.
const fs=require('node:fs'),crypto=require('node:crypto');const db=require('../server/db');const {createPlayer,issueSetup}=require('../server/app');
(async()=>{const [action,arg,out]=process.argv.slice(2);if(action==='create'){console.log('Player ID:',await createPlayer(db,arg));}
else if(action==='setup'){if(!out)throw Error('Private output file required');const token=await issueSetup(db,arg,process.argv.includes('--supervisor'));fs.writeFileSync(out,process.env.APP_ORIGIN+'/setup#'+token,{mode:0o600,flag:'wx'});console.log('Setup link written to private file. Expires in 30 minutes.');}
else if(action==='sessions'){console.log(JSON.stringify((await db.query('SELECT id,label,supervisor,last_seen,revoked FROM browser_sessions WHERE player_id=$1',[arg])).rows));}
else if(action==='revoke'){await db.query('UPDATE browser_sessions SET revoked=true WHERE id=$1',[arg]);console.log('Session revoked.');}
else throw Error('Use create nickname | setup playerId privateOutputFile [--supervisor] | sessions playerId | revoke sessionId');await db.end();})().catch(e=>{console.error(e.message);process.exit(1);});
