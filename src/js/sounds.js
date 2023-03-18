const soundsPath = `${rootPath}/src/sounds`;

const soundsFileName = {
  wake:"wake.mp3",
  alarm01:"alarm01.mp3",
};

const loadSoundFromFileName = (fileName, options={preload:true}) => new Howl({
  ...options,
  ...{src: [`${soundsPath}/${fileName}`]},
});

const sounds = Object.fromEntries(
  Object
    .entries(soundsFileName)
    .map(([name, fileName])=>[name, loadSoundFromFileName(fileName)])
);

export {soundsFileName, sounds, loadSoundFromFileName};

