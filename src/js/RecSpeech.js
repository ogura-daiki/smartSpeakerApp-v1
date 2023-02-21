
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if ('SpeechRecognition' in window) {
  // ユーザのブラウザは音声合成に対応しています。
} else {
  console.log("failed!!!");
}


class SpeechToText {
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

  static #restart(){
    this.stop();
    this.start();
  }

  static stop(){
    const rec = this.#recognition;
    rec.onsoundend = undefined;
    rec.onerror = undefined;
    rec.onnomatch = undefined;
    rec.onresult = undefined;
    
    rec.abort();
    this.#recognition = undefined;
  }

  static start(){
    let isSpeechStarted = false;

    this.#createRecognition();

    const rec = this.#recognition;

    rec.onsoundstart = ()=>{
      //document.getElementById('status').innerHTML = "認識中";
      //console.log("onsoundstart");
    };
    rec.onnomatch = ()=>{
      //console.log("onnomatch");
      //document.getElementById('status').innerHTML = "もう一度試してください";
      this.#restart();
    };
    rec.onerror = (event) => {
      //document.getElementById('status').innerHTML = "エラー";
      console.log("onerror:" + event.error);
      if (!isSpeechStarted){
        this.#restart();
      }
    };
    rec.onsoundend = ()=>{
      //document.getElementById('status').innerHTML = "停止中";
      //console.log("onsoundend");
      this.#restart();
    };
    /*
    rec.onaudiostart = ()=>{
      console.log("onaudiostart");
    }
    rec.onaudioend = ()=>{
      console.log("onaudioend");
    }
    rec.onspeechstart = ()=>{
      console.log("onspeechstart");
    }
    rec.onspeechend = ()=>{
      console.log("onspeechend");
    }
  
    rec.onend = ()=>{
      console.log("onend");
    }
    */
  
    let timerId;
    rec.onresult = (event) => {
      //console.log("result------------------");
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
      isSpeechStarted = true;
      clearTimeout(timerId);
      if (isFinal) {
        this.#restart();
      }
      else{
        timerId = setTimeout(()=>{
          this.#callback({isFinal:true, textList});
          this.#restart();
        }, 3000);
      }
    }
    isSpeechStarted = false;
    //document.getElementById('status').innerHTML = "start";
    console.log("start");
    rec.start();
  }
}

export default SpeechToText;