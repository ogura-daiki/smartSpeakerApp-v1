const speech = (text) => {
  // 発言を設定
  const uttr = new SpeechSynthesisUtterance()
  uttr.text = text
  // 発言を再生
  window.speechSynthesis.speak(uttr);
}

export {speech};
