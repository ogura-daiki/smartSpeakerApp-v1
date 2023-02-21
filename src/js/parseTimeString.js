
const numbers = String.raw`\d|[一二三四五六七八九十百千万]|\.`;
const timeUnitNames = ["hour", "minute", "second"];
const timeUnits = {
  hour:{
    str:"時間",
    seconds:1*60*60,
  },
  minute:{
    str:"分",
    seconds:1*60,
  },
  second:{
    str:"秒",
    seconds:1,
  }
};
const regexStr = timeUnitNames.map(unitName=>String.raw`(?<${unitName}>(?:${numbers})+${timeUnits[unitName].str})?`).join("")+"(?<half>半)?";
const timeRegex = new RegExp(regexStr);


const kanjiUnits = [
  {
    name:"man",
    str:"万",
    value:10000,
  },
  {
    name:"sen",
    str:"千",
    value:1000,
  },
  {
    name:"hyaku",
    str:"百",
    value:100,
  },
  {
    name:"zyu",
    str:"十",
    value:10,
  },
  {
    name:"ati",
    str:"",
    value:1,
  },
];

const kanjiNumbers = "[一二三四五六七八九]";
const kanjiNumRegexStr = kanjiUnits.map(unit=>String.raw`(?<${unit.name}>(?:${kanjiNumbers})*${unit.str})?`).join("");
const kanjiNumRegex = new RegExp(kanjiNumRegexStr);
const parseKanjiNum = str=>{
  const groups = kanjiNumRegex.exec(str)?.groups;
  if(!groups) return 0;
  let value = 0;
  for(const kanjiUnit of kanjiUnits){
    if(groups[kanjiUnit.name] == null){
      continue;
    }
    const str = groups[kanjiUnit.name].replace(kanjiUnit.str, "")||"一";
    console.log(str, kanjiUnit);
    const num = +str.replace(/[一二三四五六七八九]/g, s=>"一二三四五六七八九".indexOf(s)+1);
    value += kanjiUnit.value*num;
  }
  return value;
}

const parseTimeString = string => {
  //指定の文字以外が含まれる場合解析失敗
  if(!/^(時間|分|秒|\d|[一二三四五六七八九十千万]|\.|半)+$/.test(string)){
    return false;
  }
  const groups = timeRegex.exec(string)?.groups;
  if(!groups) return false;
  
  let lastUnit;
  let seconds = 0;
  for(const timeUnitName of timeUnitNames){
    const timeUnit = timeUnits[timeUnitName];
    if(groups[timeUnitName] == null){
      continue;
    }
    lastUnit = timeUnit;
    const str = groups[timeUnitName].replace(timeUnit.str, "");
    const isKanji = /^[一二三四五六七八九十百千万]+$/.test(str);
    const hasKanji = /[一二三四五六七八九十百千万]/.test(str);
    let num;
    if(!hasKanji){
      num = +str;
    }
    else if(!isKanji){
      const matched = /([一二三四五六七八九])([10]+)/.exec(str);
      if(!matched) return false;
      num = (+matched[1]) * ("一二三四五六七八九".indexOf(matched[0])+1);
      seconds += timeUnit.seconds*num;
    }
    else{
      num = parseKanjiNum(str);
    }
    seconds += timeUnit.seconds * num;
  }
  
  if(groups.half){
    seconds += lastUnit.seconds*0.5;
  }

  return seconds;
}

const secondsToTimeString = seconds => {
  const hour = Math.floor(seconds/timeUnits.hour.seconds);
  const minute = Math.floor(seconds%timeUnits.hour.seconds/timeUnits.minute.seconds);
  const second = seconds%timeUnits.minute.seconds;
  const unitResults = {hour, minute, second};
  return timeUnitNames.reduce((result, name)=>{
    if(unitResults[name]){
      result += unitResults[name]+timeUnits[name].str;
    }
    return result;
  },"");
}

export {parseTimeString, secondsToTimeString};