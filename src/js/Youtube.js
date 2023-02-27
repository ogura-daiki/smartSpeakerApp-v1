
const tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


const playerTask = {
  p:[],
  listener(){
    this.p.forEach((r)=>r());
    this.p = [];
  },
  wait(callback){
    let resolve;
    const promise = new Promise(r=>{resolve = r});
    this.p.push(resolve);
    callback();
    return promise;
  },
};

const createPlayer = async (id, playlistId)=>{
  const temp = document.querySelector(`#${id}`);
  if(temp instanceof HTMLIFrameElement){
    const next = document.createElement("div");
    temp.before(next);
    temp.remove();
    next.id = id;
  }
  return new Promise(r=>{
    const player = new YT.Player(id, {
      height: '360',
      width: '640',
      playerVars:{
        list: playlistId,
        listType: 'playlist',
        controls:0,
        autoplay:1,
      },
      events: {
        'onReady':function(event){r(event.target)},
        "onStateChange": e=>{
          try{
            console.log({e});
            playerTask.listener();
          }
          catch{};
        },
        'onError':e=>{
          console.log(e);
        }
      }
    });
  }) 
};


export {createPlayer, playerTask};