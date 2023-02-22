const Text = (str) => ({type:"text", value:str});

const addTimer = (duration) => ({type:"timer", value:{action:"add", duration}});
const stopTimer = () => ({type:"timer", value:{action:"stop"}});
const clearTimer = ()=>({type:"timer", value:{action:"clear"}});
const Timer = {
  add:addTimer, stop:stopTimer, clear:clearTimer,
};

const Reply = {
  Text, Timer,
};

export default Reply;