import BaseSkill from "./BaseSkill.js";
import { html, LitElement, css, when, keyed, guard } from "./Lit.js";
import { parseTimeString, secondsToTimeString } from "./parseTimeString.js";
import SpeechToText from "./RecSpeech.js";
import Reply from "./Reply.js";
import { Command, Skill, Slot } from "./Skill.js";
import { sounds } from "./sounds.js";
import { speech } from "./TextToSpeech.js";
import { TimerSession } from "./TimerSession.js";
import VocaloidSkill from "./VocaloidSkill.js";
import { createPlayer } from "./Youtube.js";
import "./TimerView.js";
import BaseElement from "./BaseElement.js";


const make = html => [...new DOMParser().parseFromString(`<html><head></head><body>${html}</body></html>`, "text/html").body.children];

class VideoView extends BaseElement{
  static get styles(){
    return css`
    :host{
      display:block;
    }
    #videoWrapper{
      pointer-events:none;
      user-select:none;
      height:100%;
      width:100%;
    }
    `;
  }
  render(){
    return html`
    <div id="videoWrapper"></div>
    `;
  }

  #ytPlayer;

  #videoWrapper;
  firstUpdated(){
    this.#videoWrapper = this.renderRoot.querySelector("#videoWrapper");
  }

  #changePlayerView(view){
    while(this.#videoWrapper.firstChild){
      this.#videoWrapper.removeChild(this.#videoWrapper.firstChild);
    }
    this.#videoWrapper.append(view);
  }

  async play({site, type, data}){
    if(site === "youtube"){
      if(type==="playlist"){
        const id = ("_"+Math.random()).replace(".","");
        const [wrapper] = make(`
        <div style="width:0px;height:0px;contain:strict;opacity:0;visibility:hidden;overflow:hidden;">
          <div id="${id}"></div>
        </div>
        `);
        document.body.append(wrapper);
        this.#ytPlayer = await createPlayer(id, data.playlistId);

        const playerView = wrapper.querySelector(`#${id}`);
        wrapper.remove();

        this.#changePlayerView(playerView);
      }
    }
  }
}
customElements.define("video-view", VideoView);

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
  link: new ReplyPattern({
    view:list=>[html`
    <div class="linkList">
      ${list.map(({url, title, thumbnail, description})=>html`
        <div class="linkItem ${thumbnail?"":"noImage"}">
          ${when(thumbnail, ()=>html`
            <img
              class="thumbnail"
              src=${thumbnail}
              @error=${e=>{
                e.target.closest(".linkItem").classList.add("noImage");
                e.target.remove();
              }}>
          `)}
          <span class="title">${title}</span>
          <span class="description">${description}</span>
          <a class="link" href=${url} target="_blank" noopener noreferrer>開く</a>
        </div>
      `)}
    </div>
    `],
    speech:list=>[],
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
        const timerSession = new TimerSession(value.duration)
        value.sessionId = timerSession.id;
        ctx.timers.push(timerSession);
        timerSession.start();
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
  media:{
    youtube:{
      loadPlaylist:new ReplyPattern({
        view:({playlist, userName}) => [`${userName}の再生リスト`],
        speech:({playlist, userName}) => [`${userName}の再生リストはこちらです`],
        action: async ({playlist, userName}, ctx) => {
          await ctx.videoView.play({site:"youtube", type:"playlist", data:{playlistId:playlist}});
          //const player = await createPlayer("temp", playlist);
          //player.playVideo();
        },
      })
    }
  }
}
const createReply = (ctx, result, keys) => {

  let patterns = ReplyPatterns;
  while(true){
    const pattern = patterns[result.type];
    const value = result.value;
    if(pattern instanceof ReplyPattern){
      const ret = Object.fromEntries(keys.map(key=>[key, pattern[key](value, ctx)]));
      return ret;
    }
    patterns = pattern;
    result = value;
  }
}

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
    #mediaBar{
      display:flex;
      flex-flow:row;
      height:100px;
      gap:16px;
      padding-right:16px;
      border-top:1px solid lightgray;
      background:rgb(200,200,200);
      align-items:center;
    }
    #videoView{
      background:rgb(50,50,50);
      min-width:200px;
      aspect-ratio:16/9;
      height:100%;
    }
    #mediaBar .description{
      flex-basis:0px;
      flex-grow:1;
    }
    #mediaBar .controls{
      display:flex;
      flex-flow:row;
      gap:8px;
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

    .linkList{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 8px;
    }
    .linkList .linkItem{
      display: grid;
      grid-template: "thumbnail title link" 1.5rem "thumbnail description link" 4.8rem / 1fr auto fit-content(4em);
      gap: 8px;
      height: fit-content;
      padding: 8px;
      border: 1px solid lightgray;
      border-radius: 1em;
    }
    .linkList .linkItem.noImage {
      grid-template: "title link" 1.5rem "description link" 4.8rem / auto fit-content(4em);
    }
    .linkList .linkItem .thumbnail{
      grid-area: thumbnail;
      height: 100%;
      object-fit: contain;
      aspect-ratio: 1 / 1;
      background: gray;
      border-radius: 1em;
      align-self: auto;
    }
    .linkList .linkItem .title{
      grid-area: title;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
      padding-left:8px;
    }
    .linkList .linkItem .description{
      grid-area: description;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      font-size: 0.8rem;
      padding-left:8px;
      align-self:center;
    }
    .linkList .linkItem .link{
      grid-area: link;
      align-self: center;
      padding-right:8px;
    }
    `;
  }
  static get properties(){
    return {
      input:{type:Array},
      timers:{type:Array},
    }
  }

  
  #skillList=[];
  registerSkill(skill){
    this.#skillList.push(skill);
  }

  #index=0;
  constructor(){
    super();
    this.input = [];
    this.timers = [];

    let waken = false;
    let timerId;
    SpeechToText.setCallback(async ({isFinal, textList})=>{
      console.log(textList);
      clearTimeout(timerId);
      if(!waken){
        waken = this.#skillList.find(s=>s.testWakeWord(textList))
        if(waken){
          SpeechToText.restart();
          sounds.wake.play();
        }
        else{
          timerId = setTimeout(()=>{
            SpeechToText.restart();
          }, 1000);
        }
        return;
      }
      if(!this.input[this.#index]){
        this.input[this.#index] = {fixed:false,text:""};
      }
      const inputSession = this.input[this.#index];
      inputSession.fixed = isFinal;
      inputSession.text = textList[0];
      if(isFinal){
        //console.log(textList)
        const result = waken.execAll(textList);
        let results = [
          Reply.Text("すみません、よくわかりませんでした。"),
        ];
        if(result.matched){
          inputSession.text = result.input;
          results = result.result;
        }

        if(results instanceof Promise){
          results = await results;
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
        waken = null;
      }
      this.requestUpdate();
    });

    this.addEventListener("timerCancel", e=>{
      /**
       * @type {TimerSession}
       */
      const timerSession = e.detail.timerSession;
      const idx = this.timers.findIndex(ts=>ts.id === timerSession.id);
      this.timers.splice(idx, 1);
      this.requestUpdate();
    });
    this.addEventListener("timerStop", e=>{
      /**
       * @type {TimerSession}
       */
      const timerSession = e.detail.timerSession;
      const idx = this.timers.findIndex(ts=>ts.id === timerSession.id);
      this.timers.splice(idx, 1);
      this.requestUpdate();
    });
  }

  #inputResult(results){
    //console.log(results);
    return results.map((result)=>{
      const {view} = createReply(this, result, ["view"]);
      return view.map(c=>html`<div class="reply">${c}</div>`);
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
      <div id=mediaBar>
        <video-view id=videoView></video-view>
        <span class=description>再生中のコンテンツの説明…</span>
        <div class=controls>
          <button>|◀</button>
          <button>再生</button>
          <button>▶|</button>
        </div>
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
    }, 100);
  }

  firstUpdated(){
    this.videoView = this.renderRoot.querySelector("#videoView");
  }
}
customElements.define("main-app", App);
const app = document.body.querySelector("main-app");
app.registerSkill(BaseSkill);
app.registerSkill(VocaloidSkill);
//SpeechToText.start();

const inputList = [
  "おはよう 世界",
  "こんにちは世界",
  "こんばんは世界の皆様",
];

//console.log(inputList.map(input=>testSkill.exec(input)));