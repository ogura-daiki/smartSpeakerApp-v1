const Text = (str) => ({type:"text", value:str});
const Link = (list) => ({type:"link", value:list});

const addTimer = (duration) => ({type:"timer", value:{type:"add", value:{duration}}});
const stopTimer = () => ({type:"timer", value:{type:"stop", value:{}}});
const clearTimer = ()=>({type:"timer", value:{type:"clear", value:{}}});
const Timer = {
  add:addTimer, stop:stopTimer, clear:clearTimer,
};

const Reply = {
  Text, Link, Timer,
};

export default Reply;