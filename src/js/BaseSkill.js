import { html, when } from "./Lit.js";
import { parseTimeString } from "./parseTimeString.js";
import Reply from "./Reply.js";
import search from "./Search.js";
import { Command, Skill, Slot } from "./Skill.js";

const BaseSkill = Skill("base", Slot`${Slot(/(はい|へい|へー|Hey|HEY|hey)/)} スピーカー`);
BaseSkill.defineSlots({
  freeWord:Slot(/(.*)?/),
  greet:Slot(["おはよう", "こんにちは", "こんばんは"]),
  duration:Slot(input=>{
    const timeString = input.replace(/\s/, "")
      .replace(/([ふぶぷ]ん|文)/g, "分")
      //.replace(/[]/g, s=>[..."一二三四五六七八九"].indexOf(s)+1)
      .replace(/[版]/, "半")
      .replace(/[点天]/, ".");
      
    const seconds = parseTimeString(timeString);
    if(!seconds){
      return false;
    }
    return {all:timeString, seconds};
  })
});

const getWikipediaSummary = searchText => {
  return fetch(`https://ja.wikipedia.org/w/api.php?origin=*&format=json&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${searchText}`)
    .then(r=>r.json())
    .then(wikiResult => Object.values(wikiResult?.query?.pages||{}).find(({extract})=>extract)?.extract);
}

const siteList = [
  "ja.wikipedia",
  "weblio",
  "kotobank.jp",
  "dictionary.goo",
  "dic.nicovideo",
  "dic.pixiv.net",
  "wikiwiki.jp",
  "atwiki",
  "seesaawiki",
  "game-info.wiki",
];

const findSummaryPage = items => {
  for(const site of siteList){
    for(const item of items){
      if(item.url.indexOf(site)>=0){
        return item;
      }
    }
  }
}

BaseSkill.defineCommands({
  greetWorldPeople:Command({
    root:Slot`${BaseSkill.slot("greet")}${BaseSkill.slot("freeWord")}`,
    callback:(result)=>{
      const greet = result.groups.greet.all;
      //alert(`世界の皆へのあいさつ：${greet}`);
      return [Reply.Text(`はい、${greet}。`)]
    }
  }),
  addTimer:Command({
    root:Slot`${BaseSkill.slot("duration")} の ${Slot(/(?:タイマー|アラーム)を?(?:セットして|かけて)/)}`,
    callback:(result)=>{

      console.log(result);
      return [
        Reply.Timer.add(result.groups.duration.seconds*1000),
      ];
    }
  }),
  stopTimer:Command({
    root:Slot(/タイマーを?(止め(て|る)|停止(して|する)?|ストップ(して|する)|消(して|す))/),
    callback:(result)=>{
      return [
        Reply.Timer.stop(),
      ]
    }
  }),
  clearTimer:Command({
    root:Slot(/(全[部て]の?)?タイマーを?(全[部て])?(クリア(して|する)?)/),
    callback:()=>[Reply.Timer.clear()],
  }),
  reload:Command({
    root:Slot(/(再読み込み|再起動|リスタート|リセット|リロード|リブート)(して)?/),
    callback:()=>{
      location.reload();
      return [];
    }
  }),
  search:Command({
    root:Slot(/(.+?)((って|とは)|(を|のこと|(は|が|って)何|について).*(教えて|知ってる|教えて|検索(して)?|調べ(る|て)?)).*/),
    callback: async (result)=>{
      const searchText = result[1];
      const searchResults = await search(searchText).then(searchResult=>{
        return searchResult.items.map(item=>{
          const title = item.title;
          const description = item.snippet;
          const url = item.link; 
          let thumbnail;// = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(item.link)}?w=128&q=${Math.random()}`;
          try{
            if(item.pagemap.cse_image){
              thumbnail = item.pagemap.cse_image[0].src;
            }
            else if(item.pagemap.cse_thumbnail){
              thumbnail = item.pagemap.cse_thumbnail[0].src;
            }
          }
          catch(e){

          }
          return {url, title, description, thumbnail};
        });
      });
      const summary = findSummaryPage(searchResults)?.description || await getWikipediaSummary(searchText);
      return [
        Reply.Text(summary||`${searchText} の検索結果はこちらです`),
        Reply.Link(searchResults),
      ];
    }
  })
});

export default BaseSkill;
