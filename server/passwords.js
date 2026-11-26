'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const scrypt=promisify(crypto.scrypt);
const options={N:32768,r:8,p:1,maxmem:64*1024*1024};
function username(value){return typeof value==='string'?value.normalize('NFKC').trim().toLowerCase():'';}
function password(value){return value.normalize('NFKC').toLowerCase();}
async function derive(value,salt){return scrypt(password(value),salt,32,options);}
async function encode(value){if(typeof value!=='string'||value.length<12||value.length>256)throw Error('Use a password of 12–256 characters.');const salt=crypto.randomBytes(16).toString('hex');return salt+':'+(await derive(value,salt)).toString('hex');}
async function verify(value,encoded){const [salt,digest]=(encoded||'00000000000000000000000000000000:'+ '00'.repeat(32)).split(':');const actual=await derive(value,salt),expected=Buffer.from(digest,'hex');return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);}
module.exports={username,encode,verify};
