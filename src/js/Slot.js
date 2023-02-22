
const regexEscapeTarget = /[\\^$.*+?()[\]{}|]/g;
const escapeRegExp = (str)=>{
  return regexEscapeTarget.test(str)
    ? str.replace(regexEscapeTarget, "\\$&")
    : str;
}

class NamedImportSlotResult {
  constructor(name, value){
    this.name = name;
    this.value = value;
  }
}

const slotFactory = {
  func:{
    cond:(fn)=>typeof fn === "function",
    converter:fn=>fn,
  },
  str:{
    cond:(str)=>{
      if(str === undefined) return false;
      return typeof str === "string";
    },
    converter:(str)=>{
      return (input)=>input===str?{all:str}:false;
    },
  },
  list:{
    cond:(list)=>list instanceof Array && !list.raw,
    converter:(list)=>{
      list = new Set(list);
      return (input)=>list.has(input)?{all:input}:false;
    }
  },
  regex:{
    cond:(regex)=>regex instanceof RegExp,
    converter:(regex)=>{
      const regexStr = (""+regex).slice(1,-1);
      regex = new RegExp(`^${regexStr}$`);
      return (input)=>regex.test(input)?{all:input, ...regex.exec(input)}:false;
    }
  },
  tag:{
    cond:(strs, ...vals)=>{
      return (
        strs instanceof Array && strs.raw instanceof Array
        && strs.length-1 === vals?.length
      );
    },
    converter:(strs, ...vals)=>{
      strs = strs.map(s=>escapeRegExp(s).replace(/\s+/g, "(?:\\s*)"));
      vals = vals.map(v=>Slot(v));
      const regexStr = vals.reduce((s,v,i)=>s+`(?<v${i}>.+?)`+`(?<s${i+1}>${strs[i+1]})`,`(?<s0>${strs[0]})`);
      const regex = new RegExp(`^${regexStr}$`);
      //console.log(regexStr, vals.map(v=>[v.slotName, v]));
      return (input) => {
        if(!regex.test(input)){
          return false;
        }
        const matchResult = regex.exec(input);
        let count=0;
        const groupEntries = [];
        let allStr = "";
        console.log(matchResult.groups)
        for(const [name, value] of Object.entries(matchResult.groups)){
          if(name[0]==="s"){
            allStr += value;
            continue;
          }

          const result = vals[+name.slice(1)](value);
          console.log(result)
          let entry;
          if(result instanceof NamedImportSlotResult){
            entry = [result.name, result.value];
          }
          else{
            entry = [count++, result];
          }
          if(entry[1] === false) return false;

          groupEntries.push(entry);
          allStr+=entry[1].all||"";
        }
        return {all:allStr, groups:Object.fromEntries(groupEntries)};
      }
    }
  },
}
const Slot = (...args) => {
  const factory = Object.values(slotFactory).find(f=>f.cond(...args));
  if(!factory){
    throw new Error("この入力からスロットを作成できません");
  }
  return factory.converter(...args);
}

const Command = ({root, callback}) => (input) => {
  const match = root(input);
  const matched = !!match;
  if(matched === false){
    return {matched};
  }
  const result = callback(match);
  return {matched, result, match};
}

const Skill = (skillName, wakeWord) => {
  const slots = new Map();
  const commands = new Map();
  return {
    defineSlots(obj){
      Object.entries(obj).forEach(([name, slot])=>{
        slot.slotName = name;
        slots.set(name, slot);
      });
    },
    slot:(name)=>{
      return (input)=>{
        if(!slots.has(name)){
          throw new Error(`スロット名：${name} は登録されていません`)
        }
        const fn = slots.get(name);
        return new NamedImportSlotResult(fn.slotName, fn(input));
      }
    },

    defineCommands(obj){
      Object.entries(obj).forEach(([name, command])=>{
        commands.set(name, command);
      });
    },

    exec(input){
      for(const [name, command] of commands.entries()){
        const result = command(input);
        if(result.matched){
          return {input:result.match.all, ...result};
        }
      }
      return {matched:false};
    },
    execAll(list){
      for(const input of list){
        for(const [name, command] of commands.entries()){
          const result = command(input);
          if(result.matched){
            //console.log(result);
            return {input:result.match.all, ...result};
          }
        }
      }
      return {matched:false};
    },
  };
}

export {Skill, Command, Slot};