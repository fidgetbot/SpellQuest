window.NARRATIVE_VERSION=2;
window.STORY_BEATS_PER_REALM=93;
window.STORY_TOTAL=1116;
function advancementCount(campaign){
  return campaign.mastered.length*3+campaign.active.reduce((sum,word)=>sum+Math.max(0,Math.min(2,Number(campaign.progress[word])||0)),0);
}
function storyPosition(campaign){
  const total=(campaign.campaignWords||WORD_BANK).length*3;
  return Math.min(STORY_TOTAL,Math.floor(advancementCount(campaign)*STORY_TOTAL/total));
}
function storyVictory(index){
  if(!Number.isInteger(index)||index<0||index>=STORY_TOTAL)throw new RangeError('Story beat outside campaign');
  const realm=STORY_REALMS[Math.floor(index/STORY_BEATS_PER_REALM)],beat=realm.beats[index%STORY_BEATS_PER_REALM];
  return {...beat,realm:realm.id,heading:realm.name+' · '+beat.scene+' · '+(index%93+1)+' / 93'};
}
function unlockedRewards(index){
  const rewards=[];
  for(const [at,label] of [[12,'Pip · companion'],[48,'Light-forged shield'],[186,'Memory lantern'],[279,'Tavi · engineer'],[372,'Promise compass'],[465,'Forest alliance'],[558,'Cinder · firebird'],[651,'Dawnrunner · skyship'],[744,'Harbor signal crews'],[837,'Teacher’s note'],[930,'Coalition road'],[1023,'Crown of Lexicon']])if(index>=at)rewards.push(label);
  return rewards;
}
function practicePassage(){
  return {heading:'A moment to recover',text:'You steady your breathing, correct your technique, and prepare to try again; the next discovery will wait until you are ready.'};
}
