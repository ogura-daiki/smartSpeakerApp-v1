const speech = (texts) => {
  window.speechSynthesis.pause();
  window.speechSynthesis.cancel();
  texts.map(text=>Object.assign(new SpeechSynthesisUtterance(), {text}))
    .forEach(uttr=>window.speechSynthesis.speak(uttr));
}

export {speech};
