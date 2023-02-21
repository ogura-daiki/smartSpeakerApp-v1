import { html, LitElement, css, when } from "./Lit.js";
import SpeechToText from "./RecSpeech.js";
import { Command, Skill, Slot } from "./Slot.js";

class App extends LitElement{
  static get styles(){
    return css`
    :host{
      display:block;
      width:100%;
      height:100%;
      background:linear-gradient(165deg, rgb(150,180,255), rgb(100,150,255));

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
      background:rgba(230,230,230);
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
    `;
  }
  static get properties(){
    return {
      input:{type:Array},
    }
  }

  #index=0;
  constructor(){
    super();
    this.input = [];

    SpeechToText.setCallback(({isFinal, textList})=>{
      if(!this.input[this.#index]){
        this.input[this.#index] = {fixed:false,text:""};
      }
      const inputSession = this.input[this.#index];
      inputSession.fixed = isFinal;
      inputSession.text = textList[0];
      if(isFinal){
        const result = testSkill.execAll(textList);
        if(!result.matched){
          this.input[this.#index].result = [
            {type:"text", value:"すみません、よくわかりませんでした。"}
          ];
          console.log("該当なし："+textList[0]);
        }
        else{
          inputSession.text = result.input;
          this.input[this.#index].result = result.result;
        }
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
    <button @click=${e=>SpeechToText.start()}>音声認識開始</button>
    <div id="timeline" style="display:flex;flex-flow:column;gap:8px;padding:8px;">
    ${this.input.map(({fixed, text, result})=>html`
      <div class="input ${fixed?"fixed":""}">${text}</div>
      ${when(result, ()=>this.#inputResult(result))}
    `)}
    </div>
    `;
  }

  scrollTimer;
  updated(){
    //const timeline = this.renderRoot.querySelector("#timeline");
    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout(()=>{
      this.scrollTo(0, this.scrollHeight - this.clientHeight);
    }, 200)
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
});

//SpeechToText.start();

const inputList = [
  "おはよう 世界",
  "こんにちは世界",
  "こんばんは世界の皆様",
];

//console.log(inputList.map(input=>testSkill.exec(input)));