import { secondsToTimeString } from "./parseTimeString.js";
import { loadSoundFromFileName, soundsFileName } from "./sounds.js";

class TimerSession {

  #id;
  #startTime;
  #duration;

  #finished=false;
  #stopped=false;
  #canceled=false;

  #sound;
  #timeoutId;

  constructor(duration){
    this.#startTime = Date.now();
    this.#id = Math.random()+":"+this.#startTime;
    this.#duration = duration;
  }

  #onFinish(){
    this.#finished = true;
  }

  start(){
    clearTimeout(this.#timeoutId);
    this.#timeoutId = setTimeout(()=>{
      this.#sound = loadSoundFromFileName(soundsFileName.alarm01, {loop:true});
      this.#sound.play();
      this.#onFinish();
    }, this.#duration);
  }

  stop(){
    this.#stopped = true;
    this.#sound?.stop();
    clearTimeout(this.#timeoutId);
  }

  cancel(){
    this.#canceled = true;
    this.stop();
    this.#onFinish();
  }


  get id(){
    return this.#id;
  }


  

  get statusText(){
    if(this.#canceled){
      return "キャンセル";
    }
    if(this.#finished){
      return "完了";
    }
    const nokori = this.#startTime + this.#duration - Date.now();
    return secondsToTimeString(Math.floor(nokori/1000));
  }

  get durationText(){
    return secondsToTimeString(this.#duration/1000);
  }

  get finished(){
    return this.#finished;
  }

  get cancelable(){
    return !this.#finished;
  }

  get ringing(){
    return this.#finished && !this.#stopped;
  }
}

export {TimerSession};