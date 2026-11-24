const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const env={};env.window=env;vm.createContext(env);for(const file of ['words.js','story-content.js','story.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),env);
module.exports={core:require('../shared/progression')(env),storyPosition:env.storyPosition,realms:env.STORY_REALMS};
