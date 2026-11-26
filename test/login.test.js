const test=require('node:test'),assert=require('node:assert/strict');
const {PGlite}=require('@electric-sql/pglite');
const {createApp,createPlayer,issueSetup}=require('../server/app'),passwords=require('../server/passwords'),migrate=require('../server/migrate');
test('password login: case folding, roles, switching, logout, legacy setup and throttling',async()=>{
 const pg=new PGlite(),db={query:(s,p)=>pg.query(s,p),connect:async()=>({query:(s,p)=>p?pg.query(s,p):s.includes(';')?pg.exec(s).then(rows=>({rows})):pg.query(s),release(){}})};
 await migrate(db);const player=await createPlayer(db,'Niko');
 const token=await issueSetup(db,player,true);
 const pass='Autumn-Compass-42',encoded=await passwords.encode(pass);
 assert.ok(!encoded.includes(pass.toLowerCase()));assert.equal(await passwords.verify(pass.toUpperCase(),encoded),true);
 for(const [username,supervisor]of [['niko',false],['gaea',true]])await db.query('INSERT INTO login_accounts(username,display_name,player_id,supervisor,password_hash) VALUES($1,$1,$2,$3,$4)',[username,player,supervisor,encoded]);
 const server=createApp(db,{origin:'http://localhost',secure:false}).listen(0);await new Promise(r=>server.once('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 async function req(path,data,cookie,origin='http://localhost'){const r=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',origin,...(cookie?{cookie}:{})},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,body:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
  assert.equal((await req('/api/login',{username:'Niko',password:pass},null,'https://evil.test')).status,403);
  const wrong=await req('/api/login',{username:'Niko',password:'incorrect'}),unknown=await req('/api/login',{username:'Nobody',password:'incorrect'});assert.equal(wrong.status,401);assert.deepEqual(wrong.body,unknown.body);
  assert.equal((await req('/api/setup/redeem',{token})).status,401);
  const parent=await req('/api/login',{username:'gAeA',password:pass.toUpperCase()});assert.equal(parent.status,200);assert.equal(parent.body.redirect,'/dashboard');assert.equal((await req('/api/dashboard',undefined,parent.cookie)).status,200);
  const child=await req('/api/login',{username:' NIKO ',password:pass.toLowerCase(),supervisor:true},parent.cookie);assert.equal(child.status,200);assert.equal(child.body.redirect,'/');assert.equal((await req('/api/dashboard',undefined,child.cookie)).status,403);assert.equal((await req('/api/dashboard',undefined,parent.cookie)).status,401);
  assert.equal((await req('/api/session',undefined,child.cookie)).body.playerId,player);
  await req('/api/session/logout',{},child.cookie);assert.equal((await req('/api/campaign',undefined,child.cookie)).status,401);
  let last;for(let i=0;i<16;i++)last=await req('/api/login',{username:i%2?'NIKO':'niko',password:'wrong'});assert.equal(last.status,429);

  const {resetPasswords}=require('../server/accounts');
  await assert.rejects(()=>resetPasswords(db,[{username:'niko',password:'Newpass8'},{username:'missing',password:'Otherpass8'}]));
  assert.equal((await db.query("SELECT password_hash FROM login_accounts WHERE username='niko'")).rows[0].password_hash,encoded);
  await assert.rejects(()=>resetPasswords(db,[{username:'niko',password:'short'}]));
  await resetPasswords(db,[{username:'Niko',password:'Newpass8'},{username:'Gaea',password:'Parentpass8'}]);
  const reset=await req('/api/login',{username:'NIKO',password:'NEWPASS8'});assert.equal(reset.status,200);
  assert.equal((await req('/api/login',{username:'niko',password:pass})).status,401);
  await resetPasswords(db,[{username:'Niko',password:'Nextpass8'}]);
  assert.equal((await req('/api/session',undefined,reset.cookie)).status,401);
 }finally{await new Promise(r=>server.close(r));await pg.close();}
});
