import { parseTimeString } from "./parseTimeString.js";
import Reply from "./Reply.js";
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
  })
});

export default BaseSkill;
