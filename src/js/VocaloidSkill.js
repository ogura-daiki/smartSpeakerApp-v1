import Reply from "./Reply.js";
import { Command, Skill, Slot } from "./Skill.js";
import Romanizer from "https://cdn.skypack.dev/js-hira-kata-romanize";
import search from "./Search.js";

const r = new Romanizer({
  chouon: Romanizer.CHOUON_ALPHABET,
});

const VocaloidSkill = Skill("vocaloidBot", Slot(/ボカ\s*ロ\s*([ボポ]ット|bot|BOT|Bot)[\s\S]*/));

const searchVocaloidP = name => fetch(`https://script.google.com/macros/s/AKfycby7bwBdLa9u0AlRePq8VZ3OCD0vTtl-Wi9OdF4cjTIomjHEhKX0PHcoYPkpyQJegVj1/exec?q=${name}`).then(r=>r.json())

VocaloidSkill.defineCommands({
  playProducer:Command({
    root:Slot(/(?<name>.*?)の(?:ボカロ)?曲を?(かけ|つけ|再生(し|す)?).*/),
    callback: async result=>{
      const name = result.groups.name.replace(/\s+/g,"");
      
      const searchResults = await search(`${name} site:https://vocadb.net/Ar`).then(searchResult=>{
        console.log(searchResult);
        return searchResult.items?.filter(item=>{
          const url = item.link; 
          return url.match(/https:\/\/vocadb.net\/Ar/);
        }).map(item=>{
          return {name:item.title.replace(/-[^\-]*$/, "").trim(), url:item.link};
        });
      });

      console.log(searchResults);
      if(searchResults?.length){
        const artistData = await fetch(`https://vocadb.net/api/artists/${searchResults[0].url.match(/\/Ar\/(\d+)/)[1]}?fields=WebLinks`).then(r=>r.json());
        const youtubeLink = (artistData?.webLinks||[]).find(link=>link.category === "Official" && link.description.match("[Yy]ou[Tt]ube"));
        if(youtubeLink){
          const playlistId = "UU"+youtubeLink.url.match(/youtube.com\/channel\/(?<id>[^/]+)/)?.groups.id.slice(2);
          return [
            Reply.Media.Youtube.loadPlaylist({userName:searchResults[0].name, playlist:playlistId}),
          ];
        }
      }
      let searchName = name;

      let list = await searchVocaloidP(searchName);
      if(!list.length){
        const roma = r.romanize(searchName);
        list = await searchVocaloidP(roma);
      }
      
      if(!list.length){
        return [
          Reply.Text(`アーティスト名：${searchName}のYoutubeアカウントが見つかりませんでした`),
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