import BaseElement from "./BaseElement.js";
import { css, html, when } from "./Lit.js";
import { TimerSession } from "./TimerSession.js";

class TimerView extends BaseElement{
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

  /**
   * @type {TimerSession}
   */
  timerSession;

  constructor(){
    super();
    const loop = ()=>{
      this.requestUpdate();
      if(this.timerSession?.finished){
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
    return html`
    <div>タイマー</div>
    <div id=container>
      <div>
        <div id=icon>⌛</div>
      </div>
      <div id=display>
        <span id=max>${this.timerSession.durationText}</span>
        <span id=status>${this.timerSession.statusText}</span>
      </div>
      ${when(
        this.timerSession.cancelable,
        ()=>html`
          <button @click=${()=>{
            this.timerSession.cancel();
            this.dispatch("timerCancel", {timerSession:this.timerSession});
          }}>
              キャンセル
          </button>
        `
      )}
      ${when(
        this.timerSession.ringing,
        ()=>html`
          <button
            @click=${()=>{
              this.timerSession.stop();
              this.requestUpdate();
              this.dispatch("timerStop", {timerSession:this.timerSession});
            }}
          >
            停止
          </button>
        `
      )}
    </div>
    `;
  }
}
customElements.define("timer-view", TimerView);