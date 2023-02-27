import Reply from "./Reply.js";
import { Command, Skill, Slot } from "./Skill.js";
import Romanizer from "https://cdn.skypack.dev/js-hira-kata-romanize";

const r = new Romanizer({
  chouon: Romanizer.CHOUON_ALPHABET,
});

const VocaloidSkill = Skill("vocaloidBot", Slot(/ボカ\s*ロ\s*([ボポ]ット|bot|BOT|Bot)[\s\S]*/));

const searchVocaloidP = name => fetch(`https://script.google.com/macros/s/AKfycby7bwBdLa9u0AlRePq8VZ3OCD0vTtl-Wi9OdF4cjTIomjHEhKX0PHcoYPkpyQJegVj1/exec?q=${name}`).then(r=>r.json())

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

      const [userName, playlist] = list[0];
      console.log(userName, playlist);
      return [
        Reply.Media.Youtube.loadPlaylist({userName, playlist}),
      ];
    }
  })
})

export default VocaloidSkill;