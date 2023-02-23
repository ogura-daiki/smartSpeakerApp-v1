
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

class Slot {
  constructor(fn, regexStr){
    this.fn = fn;
    this.regexpString = regexStr
  }
  exec(input){
    return this.fn(input);
  }
}

class NamedImportSlot extends Slot {
  constructor(slot){
    super(null, slot.regexpString);
    this.slot = slot;
  }
  exec(input){
    return new NamedImportSlotResult(this.slot.slotName, this.slot.exec(input));
  }
}

const slotFactory = {
  slot:{
    cond:(o)=>o instanceof Slot,
    converter:o=>o,
  },
  func:{
    cond:(fn)=>typeof fn === "function",
    converter:fn=>new Slot(fn, ".*"),
  },
  str:{
    cond:(str)=>{
      if(str === undefined) return false;
      return typeof str === "string";
    },
    converter:(str)=>{
      return new Slot((input)=>input===str?{all:str}:false, escapeRegExp(str));
    },
  },
  list:{
    cond:(list)=>list instanceof Array && !list.raw,
    converter:(list)=>{
      list = new Set(list);
      return new Slot((input)=>list.has(input)?{all:input}:false, `(?:${[...list.keys()].map(escapeRegExp).join("|")})`);
    }
  },
  regex:{
    cond:(regex)=>regex instanceof RegExp,
    converter:(regex)=>{
      const regexStr = (""+regex).slice(1,-1);
      regex = new RegExp(`^${regexStr}$`);
      return new Slot((input)=>regex.test(input)?{all:input, ...regex.exec(input)}:false, regexStr);
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
      vals = vals.map(v=>SlotBuilder(v));
      const regexStr = vals.reduce((s,v,i)=>s+`(?<v${i}>${v.regexpString})`+`(?<s${i+1}>${strs[i+1]})`,`(?<s0>${strs[0]})`);
      const regex = new RegExp(`^${regexStr}$`);
      //console.log(regex)
      //console.log(regexStr, vals.map(v=>[v.slotName, v]));
      const func = (input) => {
        if(!regex.test(input)){
          return false;
        }
        const matchResult = regex.exec(input);
        let count=0;
        const groupEntries = [];
        let allStr = "";
        //console.log(matchResult.groups)
        for(const [name, value] of Object.entries(matchResult.groups)){
          if(name[0]==="s"){
            allStr += value;
            continue;
          }

          const result = vals[+name.slice(1)].exec(value.trim());
          //console.log(result)
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
      return new Slot(func, regexStr);
    }
  },
}
const SlotBuilder = (...args) => {
  const factory = Object.values(slotFactory).find(f=>f.cond(...args));
  if(!factory){
    throw new Error("この入力からスロットを作成できません");
  }
  return factory.converter(...args);
}

const Command = ({root, callback}) => ({exec:(input) => {
  const match = root.exec(input);
  const matched = !!match;
  if(matched === false){
    return {matched};
  }
  const result = callback(match);
  return {matched, result, match};
}})

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
      return new NamedImportSlot(slots.get(name));
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
          const result = command.exec(input);
          if(result.matched){
            //console.log(result);
            return {input:result.match.all, ...result};
          }
        }
      }
      return {matched:false};
    },

    testWakeWord(textList){
      return textList.some(text=>wakeWord.exec(text));
    }
  };
}

export {Skill, Command, SlotBuilder as Slot};