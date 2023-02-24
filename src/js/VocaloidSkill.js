import Reply from "./Reply.js";
import { Command, Skill, Slot } from "./Skill.js";
import Romanizer from "https://cdn.skypack.dev/js-hira-kata-romanize";

const r = new Romanizer({
  chouon: Romanizer.CHOUON_ALPHABET,
});

const VocaloidSkill = Skill("vocaloidBot", Slot(/ボカ\s*ロ\s*([ボポ]ット|bot|BOT|Bot)[\s\S]*/));

const searchVocaloidP = name => fetch(`https://script.google.com/macros/s/AKfycbykdy4aTpYdT3pu4GLS7R4BKNbuCFyTH4xWlxrFDoPuBSw1A2sAFN7KdezjRfGFmjsj/exec?q=${name}`).then(r=>r.json())

VocaloidSkill.defineCommands({
  playProducer:Command({
    root:Slot(/(?<name>.*?)の曲を?(かけ|つけ|再生(し|す)?).*/),
    callback: async result=>{
      const name = result.groups.name.replace(/\s+/g,"");

      let list = await searchVocaloidP(name);
      if(!list.length){
        const roma = r.romanize(name);
        list = await searchVocaloidP(roma);
      }
      
      if(!list.length){
        return [
          Reply.Text(`アーティスト名：${name}のYoutubeアカウントが見つかりませんでした`),
        ];
      }

      return [
        Reply.Link(list.map(item=>({url:`https://www.youtube.com/watch?v=&list=${item[1]}`, title:item[0], description:`${item[0]} のYoutubeチャンネル`})))
      ];
    }
  })
})

export default VocaloidSkill;