import { html, LitElement, css, when } from "./Lit.js";
import { parseTimeString, secondsToTimeString } from "./parseTimeString.js";
import SpeechToText from "./RecSpeech.js";
import { Command, Skill, Slot } from "./Slot.js";
import { speech } from "./TextToSpeech.js";

class App extends LitElement{
  static get styles(){
    return css`
    :host{
      display:block;
      width:100%;
      height:100%;
      background:linear-gradient(165deg, rgb(150,180,255), rgb(100,150,255));

    }
    #root{
      width:100%;
      height:100%;
      display:flex;
      flex-flow:column;
    }
    #timeline{
      display:flex;
      flex-flow:column;
      gap:8px;
      padding:8px;
      flex-basis:0px;
      flex-grow:1;

      
      overflow-x:hidden;
      scroll-behavior: smooth;
    }
    .input, .reply{
      border:1px solid rgba(0,0,0,.5);
      border-radius:8px;
      padding:8px 16px;
      box-sizing:border-box;
      width:calc(100% - 32px);
      animation:in .3s both;
    }
    .input{
      margin-top:8px;
      border-top-right-radius:0px;
      background:rgb(100,230,100);
      color:rgba(0,0,0,.5);
      align-self:flex-end;
      --move-dir:1;
    }
    .input.fixed{
      color:black;
    }
    
    .reply{
      border-top-left-radius:0px;
      background:rgba(250,250,250);
      color:black;
      align-self:flex-start;
      --move-dir:-1;
    }

    @keyframes in{
      from{
        transform:translateX(calc(var(--move-dir) * 16px));
        opacity:0;
      }
      to{
        transform:translateX(0px);
        opacity:1;
      }
    }

    #bottomBar{
      padding:8px 16px;
      background:rgb(250,250,250);
      box-sizing:border-box;
    }
    `;
  }
  static get properties(){
    return {
      input:{type:Array},
      timers:{type:Array},
    }
  }

  #index=0;
  constructor(){
    super();
    this.input = [];
    this.timers = [];

    SpeechToText.setCallback(({isFinal, textList})=>{
      if(!this.input[this.#index]){
        this.input[this.#index] = {fixed:false,text:""};
      }
      const inputSession = this.input[this.#index];
      inputSession.fixed = isFinal;
      inputSession.text = textList[0];
      if(isFinal){
        console.log(textList)
        const result = testSkill.execAll(textList);
        let results = [
          {type:"text", value:"すみません、よくわかりませんでした。"},
        ];
        if(!result.matched){
          console.log("該当なし："+textList[0]);
        }
        else{
          inputSession.text = result.input;
          results = result.result;
        }

        inputSession.results = results;
        console.log(result, results);
        const texts = [];
        for(const result of results){
          if(result.type === "text"){
            texts.push(result.value);
          }
          else if(result.type === "timer"){
            if(result.value.action === "add"){
              const id = Math.random()+Date.now();
              const timerSession = {
                id,
                start:Date.now(),
                timeoutId:setTimeout(()=>{
                  alert("タイマーが完了しました");
                  const idx = this.timers.findIndex(t=>t.id === id);
                  this.timers.splice(idx, 1);
                  this.requestUpdate();
                }, result.value.duration),
              };
              this.timers.push(timerSession);
              this.requestUpdate();
            }
          }
        }
        speech(texts);

        this.#index+=1;
      }
      this.requestUpdate();
    });
  }

  #inputResult(results){
    console.log(results);
    return results.map(({type, value})=>{
      if(type === "text"){
        return html`
        <div class="reply">${value}</div>
        `;
      }
    });
  }

  render(){
    return html`
    <div id="root">
      <div id="timeline">
      ${this.input.map(({fixed, text, results})=>html`
        <div class="input ${fixed?"fixed":""}">${text}</div>
        ${when(results, ()=>this.#inputResult(results))}
      `)}
      </div>
      <div id="bottomBar">
        <button @click=${e=>SpeechToText.start()}>音声認識開始</button>
        <button>⌚${when(this.timers.length, ()=>html`<span>${this.timers.length}</span>`)}</button>
      </div>
    </div>
    `;
  }

  scrollTimer;
  updated(){
    const timeline = this.renderRoot.querySelector("#timeline");
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(()=>{
      timeline.scrollTo(0, timeline.scrollHeight - timeline.clientHeight);
    }, 100)
  }
}
customElements.define("main-app", App);

const testSkill = Skill("test");
testSkill.defineSlots({
  greet:Slot(["おはよう", "こんにちは", "こんばんは"]),
  greetWorld:Slot`${testSkill.slot("greet")} 世界`,
});

testSkill.defineCommands({
  greetWorldPeople:Command({
    root:Slot`${testSkill.slot("greetWorld")} の${Slot(/(皆|みんな)(様方?|たち)?/)}`,
    callback:(result)=>{
      const greet = result.groups.greetWorld.groups.greet.all;
      //alert(`世界の皆へのあいさつ：${greet}`);
      return [{type:"text", value:`はい、${greet}。`}]
    }
  }),
  timer:Command({
    root:Slot(input=>{
      const result = /^(?<time>.+)+(?<operate>の(?:タイマー|アラーム)を?(?:セットして|かけて))$/.exec(input);
      if(!result) return false;
      const timeString = result.groups.time
        .replace(/\s/, "")
        .replace(/([ふぶぷ]ん|文)/g, "分")
        //.replace(/[]/g, s=>[..."一二三四五六七八九"].indexOf(s)+1)
        .replace(/[版]/, "半")
        .replace(/[点天]/, ".");

      const seconds = parseTimeString(timeString);
      if(!seconds){
        return false;
      }
      const readableTimeString = secondsToTimeString(seconds);
      console.log(readableTimeString);
      return {all:timeString+result.groups.operate, value:{seconds, timeString:readableTimeString}};
    }),
    callback:(result)=>{
      return [
        {type:"timer", value:{action:"add", duration:result.value.seconds*1000}},
        {type:"text", value:`${result.value.timeString}のタイマーをセットしました`}
      ];
    }
  })
});

//SpeechToText.start();

const inputList = [
  "おはよう 世界",
  "こんにちは世界",
  "こんばんは世界の皆様",
];

//console.log(inputList.map(input=>testSkill.exec(input)));