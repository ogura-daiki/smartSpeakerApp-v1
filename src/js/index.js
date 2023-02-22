import { html, LitElement, css, when, keyed, guard } from "./Lit.js";
import { parseTimeString, secondsToTimeString } from "./parseTimeString.js";
import SpeechToText from "./RecSpeech.js";
import Reply from "./Reply.js";
import { Command, Skill, Slot } from "./Slot.js";
import { speech } from "./TextToSpeech.js";

const sounds = {
  alarm01:new Howl({
    src: [`${rootPath}/src/sounds/alarm01.mp3`],
  }),
};

const newAlarmSound = ()=>new Howl({
  src: [`${rootPath}/src/sounds/alarm01.mp3`],
  loop:true,
});

const TimerSession = (ctx, duration) => {
  const start = Date.now();
  const id = Math.random()+":"+start;
  console.log({start, id});
  const timerSession = {
    id,
    start,
    duration,
    finished:false,
    stopped:false,
    canceled:false,
    
    onFinish:()=>{
      timerSession.finished=true;
    },
    stop:()=>{
      timerSession.stopped = true;
      timerSession.sound?.stop();
      const idx = ctx.timers.findIndex(t=>t.id === id);
      clearTimeout(timerSession.timeoutId);
      ctx.timers.splice(idx, 1);
      ctx.requestUpdate();
    },
    cancel:()=>{
      //alert("タイマーをキャンセルしました");
      timerSession.canceled = true;
      timerSession.stop();
      timerSession.onFinish();
    },
    timeoutId:setTimeout(()=>{
      //alert("タイマーが完了しました");
      timerSession.sound = newAlarmSound();
      timerSession.sound.play();
      timerSession.onFinish();
    }, duration),
  };
  return timerSession;
}

class ReplyPattern {
  constructor({view, speech, action}){
    Object.assign(this, {view, speech, action});
  }
}
const ReplyPatterns = {
  text: new ReplyPattern({
    view:value=>[value],
    speech:value=>[value],
    action:()=>{},
  }),
  timer:{
    add:new ReplyPattern({
      view:(value, ctx)=>[
        guard([value.sessionId], ()=>{
          const timerSession = ctx.timers.find(ts=>ts.id === value.sessionId);
          return html`<timer-view .timerSession=${timerSession}></timer-view>`;
        }),
        `${secondsToTimeString(value.duration/1000)}のタイマーをセットしました`,
      ],
      speech:value=>[`${secondsToTimeString(value.duration/1000)}のタイマーをセットしました`],
      action:(value, ctx)=>{
        const timerSession = TimerSession(ctx, value.duration)
        value.sessionId = timerSession.id;
        ctx.timers.push(timerSession);
        ctx.requestUpdate();
      },
    }),
    stop:new ReplyPattern({
      view:value=>[when(
        value.stopCount,
        ()=>`${value.stopCount}件のタイマーを停止しました`,
        ()=>`停止するタイマーがありませんでした`,
      )],
      speech:()=>[],
      action:(value, ctx)=>{
        const targetList = ctx.timers.filter(ts=>ts.finished && !ts.stopped);
        value.stopCount = targetList.length;
        targetList.forEach(ts=>ts.stop());
      }
    }),
    clear:new ReplyPattern({
      view:value=>[`全てのタイマーを削除しました`],
      speech:value=>[`全てのタイマーを削除しました`],
      action:(value, ctx)=>{
        ctx.timers.forEach(ts=>ts.cancel());
      }
    }),
  },
}
const createReply = (ctx, result, keys) => {

  let patterns = ReplyPatterns;
  console.log(result);
  while(true){
    const pattern = patterns[result.type];
    const value = result.value;
    if(pattern instanceof ReplyPattern){
      console.log(result, value)
      const ret = Object.fromEntries(keys.map(key=>[key, pattern[key](value, ctx)]));
      console.log(ret);
      return ret;
    }
    patterns = pattern;
    result = value;
  }
}

class TimerView extends LitElement{
  static get styles(){
    return css`
    #container{
      display:flex;
      flex-flow:row;
      place-items:center;
    }
    #icon{
      display:grid;
      place-items:center;
      font-size:3rem;
    }
    #display{
      padding-left:1rem;
      display:flex;
      flex-flow:column;
      flex-grow:1;
      gap:8px;
    }
    #max{
      font-size:1rem;
      line-height:1;
    }
    #status{
      font-size:2rem;
      line-height:1;
    }
    `;
  }

  static get properties(){
    return {
      timerSession:{type:Object},
    };
  }

  constructor(){
    super();
    const loop = ()=>{
      this.requestUpdate();
      if(this.timerSession && this.timerSession.finished){
        return;
      }
      setTimeout(loop, 500);
    };
    loop();
  }

  render(){
    if(!this.timerSession){
      return;
    }
    const nokori = this.timerSession.canceled? 0 : Math.max(0, (this.timerSession.start+this.timerSession.duration)-Date.now());
    const status = this.timerSession.canceled?"キャンセル":this.timerSession.finished?"完了":secondsToTimeString(Math.floor(nokori/1000));
    //console.log(nokori);
    return html`
    <div>タイマー</div>
    <div id=container>
      <div>
        <div id=icon>⌛</div>
      </div>
      <div id=display>
        <span id=max>${secondsToTimeString(this.timerSession.duration/1000)}</span>
        <span id=status>${status}</span>
      </div>
      ${when(!this.timerSession.finished, ()=>html`<button @click=${()=>this.timerSession.cancel()}>キャンセル</button>`)}
      ${when(this.timerSession.finished && !this.timerSession.stopped, ()=>html`<button @click=${()=>{this.timerSession.stop();this.requestUpdate()}}>停止</button>`)}
    </div>
    `;
  }
}
customElements.define("timer-view", TimerView);

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

    #timerButton{
      position:relative;
    }
    .badge{
      background:crimson;
      border-radius:999999vmax;
      color:white;
      padding:3px 4px 1px 4px;
      font-size:0.5rem;
      line-height:0.5rem;
      display:grid;
      place-items:center;

      position:absolute;
      top:0px;
      right:0px;
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
        //console.log(textList)
        const result = testSkill.execAll(textList);
        let results = [
          Reply.Text("すみません、よくわかりませんでした。"),
        ];
        if(result.matched){
          inputSession.text = result.input;
          results = result.result;
        }

        inputSession.results = results;
        //console.log(result, results);
        const texts = [];
        for(const result of results){
          const {speech} = createReply(this, result, ["action", "speech"]);
          texts.push(speech);
        }
        texts.flat(Infinity);
        speech(texts);

        this.#index+=1;
      }
      this.requestUpdate();
    });
  }

  #inputResult(results){
    //console.log(results);
    return results.map((result)=>{
      const {view} = createReply(this, result, ["view"]);
      return view.map(c=>html`<div class="reply">${c}</div>`);
      if(type === "text"){
        return html`
        <div class="reply">${value}</div>
        `;
      }
      else if(type === "timer" && value.action === "add"){
        return guard([value.sessionId], ()=>html`
        <div class="reply">
          <timer-view .timerSession=${this.timers.find(ts=>ts.id === value.sessionId)}></timer-view>
        </div>
        `);
      }
      else if(type === "timer" && value.action === "stop"){
        return when(value.stopCount, ()=>html`<div class="reply">${value.stopCount}件のタイマーを停止しました</div>`, ()=>html`<div class="reply">停止するタイマーがありませんでした</div>`)
      }
      else if(type === "timer" && value.action === "clear"){
        return html`<div class="reply">すべてのタイマーを削除しました</div>`;
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
        <button id="timerButton">⌚${when(this.timers.length, ()=>html`<span class="badge">${this.timers.length}</span>`)}</button>
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

testSkill.defineCommands({
  greetWorldPeople:Command({
    root:Slot`${testSkill.slot("greetWorld")} の${Slot(/(皆|みんな)(様方?|たち)?/)}`,
    callback:(result)=>{
      const greet = result.groups.greetWorld.groups.greet.all;
      //alert(`世界の皆へのあいさつ：${greet}`);
      return [Reply.Text(`はい、${greet}。`)]
    }
  }),
  addTimer:Command({
    root:Slot`${testSkill.slot("duration")} の ${Slot(/(?:タイマー|アラーム)を?(?:セットして|かけて)/)}`,
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
    root:Slot(/(再読み込み|リロード)(して)?/),
    callback:()=>{
      location.reload();
      return [];
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