
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if ('SpeechRecognition' in window) {
  // ユーザのブラウザは音声合成に対応しています。
} else {
  console.log("failed!!!");
}

class SpeechToText {

  static isSpeechStarted;
  static timerId;
  constructor(){
    throw new Error();
  }

  static #callback;
  static setCallback(fn){
    this.#callback = fn;
  }

  static #recognition;
  static #createRecognition(){
    if(this.#recognition){
      this.stop();
    }
    const recognition = this.#recognition = new SpeechRecognition();
    recognition.lang = 'ja-Jp';
    recognition.interimResults = true;
    recognition.maxAlternatives = 100;
    recognition.continuous = true;
  }

  static restart(){
    this.stop();
    this.start();
  }

  static #callbacks = {
    match:()=>this.restart(),
    soundend:()=>this.restart(),
    error:(event) => {
      console.log("onerror:" + event.error);
      if (!this.isSpeechStarted){
        this.restart();
      }
    },
    result:event=>{
      let isFinal = false;
      const results = event.results;
      const textList = [];
      for (const result of results){
        isFinal = result.isFinal;
        for (const alt of result){
          textList.push(alt.transcript);
          //console.log(`[alternative]${alt.transcript}(${alt.confidence})`);
        }
      }
      this.#callback({isFinal, textList});
      this.isSpeechStarted = true;
      clearTimeout(this.timerId);
      if (isFinal) {
        this.restart();
        return;
      }
      
      this.timerId = setTimeout(()=>{
        console.log({textList})
        this.#callback({isFinal:true, textList});
        this.restart();
      }, 3000);
    }
  };

  static stop(){
    const rec = this.#recognition;
    Object.entries(this.#callbacks)
      .forEach(([name, func])=>rec.removeEventListener(name, func));
    console.log(this.timerId)
    clearTimeout(this.timerId);
    
    rec.abort();
    this.#recognition = undefined;
  }

  static start(){

    this.#createRecognition();
    const rec = this.#recognition;

    Object.entries(this.#callbacks)
      .forEach(([name, func])=>rec.addEventListener(name, func));
    this.isSpeechStarted = false;
    //document.getElementById('status').innerHTML = "start";
    console.log("start");
    rec.start();
  }
}

export default SpeechToText;