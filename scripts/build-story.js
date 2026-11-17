const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const names=['Briarwood','Drowned Archives','Clockwork City','Mirror Desert','Rootbound Court','Ember Peaks','Skychain Isles','Silent Coast','Inverted Observatory','Ashen March','Last Library','Unwritten Citadel'];
const goals=['Free the forest guardians','Recover the stolen histories','Restore the city’s own choices','Expose the false guide','Unite the divided river clans','Bring the mountain families to safety','Reunite the party above the clouds','Return the harbor’s voices','Discover the Crown’s true purpose','Protect the coalition’s road','Save the original histories','Restore the kingdom without repeating its mistakes'];
const summaries=[
'You freed Pip and the bound guardians, restored Briarwood’s roads, and received a light-forged shield.',
'You drained the Archives, recovered stolen memories, and learned that the Regent was once their archivist.',
'You freed Clockwork City from forced labor; Tavi joined you after repairing its machines for peaceful work.',
'You exposed Venn’s betrayal, rescued his sister Mira, and gained a compass guided by freely kept promises.',
'You uncovered the poison scheme, healed the river, and united the oak and willow clans.',
'You evacuated Ember Peaks, founded Dawnrest, and freed Cinder, who chose to return as your companion.',
'You reunited your separated party, repaired the floating islands, and built the skyship Dawnrunner.',
'You used shared signals to defeat the listening network and return the harbor’s stolen voices.',
'You learned the Regent’s loss, recovered his teacher’s note, and discovered how the Crown restores freely shared histories.',
'Your earlier allies held a safe corridor across the March, freed bound guardians, and protected the refugees.',
'You opened the Last Library’s locked histories, assembled the unfinished Crown, and carried its originals to safety.',
'You reached the Regent with your companions, helped him release the shadow mantle, and restored the kingdom’s voices.'
];
const files=fs.readdirSync(path.join(root,'story/realms')).filter(f=>f.endsWith('.txt')).sort(),seen=new Set();
const realms=files.map((file,r)=>{
 let scene='',sceneIndex=-1;const beats=[];
 for(const line of fs.readFileSync(path.join(root,'story/realms',file),'utf8').split('\n')){
  if(line.startsWith('# ')){scene=line.slice(2);sceneIndex++;continue;}
  if(!line.trim())continue;
  if(seen.has(line))throw Error('Duplicate authored sentence: '+line);seen.add(line);
  beats.push({id:'r'+String(r+1).padStart(2,'0')+'-'+String(beats.length+1).padStart(2,'0'),scene,sceneIndex,text:line});
 }
 if(beats.length!==93||sceneIndex!==7)throw Error(file+' must contain 93 beats in 8 scenes');
 return {id:r,name:names[r],goal:goals[r],summary:summaries[r],beats};
});
if(realms.length!==12)throw Error('Expected 12 realms');
const all=realms.flatMap(r=>r.beats);
const effects={12:'Pip joins',48:'Light-forged shield',186:'Memory lantern',279:'Tavi joins',372:'Promise compass',465:'Forest alliance',558:'Cinder joins',651:'Dawnrunner',744:'Harbor signals',837:'Teacher’s note',930:'Coalition road',1023:'Crown assembled',1116:'Kingdom restored'};
all.forEach((beat,i)=>{beat.requires=i?[all[i-1].id]:[];beat.effects=effects[i+1]?[effects[i+1]]:[];});
fs.writeFileSync(path.join(root,'story-content.js'),'// Generated from story/realms by scripts/build-story.js; edit the authored sources.\nwindow.STORY_REALMS='+JSON.stringify(realms,null,2)+';\n');
console.log('Built 12 realms, 96 scenes, '+seen.size+' individually authored beats.');
