import { LitElement } from "./Lit.js";

class BaseElement extends LitElement{
  dispatch(eventType, detail={}){
    this.dispatchEvent(new CustomEvent(eventType, { bubbles:true, composed:true, detail}));
  }
}

export default BaseElement;