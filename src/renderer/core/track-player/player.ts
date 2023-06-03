import Store from "@/common/store";
import trackPlayer from "./internal";
import { RepeatMode, TrackPlayerEvent } from "./enum";
import trackPlayerEventsEmitter from "./event";
import shuffle from "lodash.shuffle";
import { isSameMedia } from "@/common/media-util";

// 加入播放列表的时间
const timeStampSymbol = Symbol.for("time-stamp");
// 加入播放列表的辅助顺序
const sortIndexSymbol = Symbol.for("sort-index");

/** 音乐队列 */
const musicQueueStore = new Store<IMusic.IMusicItem[]>([]);

/** 当前播放 */

const currentMusicStore = new Store<IMusic.IMusicItem | null>(null);
/** 播放模式 */
const repeatModeStore = new Store(RepeatMode.Queue);

/** 播放下标 */
let currentIndex = -1;

trackPlayerEventsEmitter.on(TrackPlayerEvent.PlayEnd, () => {});

function setMusicQueue(musicQueue: IMusic.IMusicItem[]) {
  musicQueueStore.setValue(musicQueue);
}

function setCurrentMusic(music: IMusic.IMusicItem | null) {
  currentMusicStore.setValue(music);
}

function toggleRepeatMode() {
  let nextRepeatMode: RepeatMode = repeatModeStore.getValue();
  switch (nextRepeatMode) {
    case RepeatMode.Shuffle:
      nextRepeatMode = RepeatMode.Loop;
      break;
    case RepeatMode.Loop:
      nextRepeatMode = RepeatMode.Queue;
      break;
    case RepeatMode.Queue:
      nextRepeatMode = RepeatMode.Shuffle;
      break;
  }
  setRepeatMode(nextRepeatMode);
}

function setRepeatMode(repeatMode: RepeatMode) {
  if (repeatMode === RepeatMode.Shuffle) {
    setMusicQueue(shuffle(musicQueueStore.getValue()));
  }
  repeatModeStore.setValue(repeatMode);
  currentIndex = findMusicIndex(currentMusicStore.getValue());
}

function findMusicIndex(musicItem?: IMusic.IMusicItem) {
  if (!musicItem) {
    return -1;
  }
  const musicQueue = musicQueueStore.getValue();
  return musicQueue.findIndex((item) => isSameMedia(musicItem, item));
}

/**
 * 歌单行为
 */

function addToEnd() {}

function addNext() {}

function skipToNext() {
  const musicQueue = musicQueueStore.getValue();
  if (musicQueue.length === 0) {
    currentIndex = -1;
    setCurrentMusic(null);
    return;
  }
}

function splice() {}

interface IPlayOptions {
    restartOnSameMedia: boolean;
}

function playIndex(nextIndex: number, options: IPlayOptions) {
  const musicQueue = musicQueueStore.getValue();

  nextIndex = (nextIndex + musicQueue.length) % musicQueue.length;
  // 歌曲重复
  if(nextIndex === currentIndex && currentIndex !== -1) {
    const restartOnSameMedia = options?.restartOnSameMedia ?? true;
    if(restartOnSameMedia) {
        trackPlayer.seekTo(0);
    }
    trackPlayer.play();
  } else {
    // 插件获取media

  }
}

function playMusic(musicItem: IMusic.IMusicItem, options: IPlayOptions) {
  const musicQueue = musicQueueStore.getValue();
  const queueIndex = findMusicIndex(musicItem);
  if (queueIndex === -1) {
    // 添加到列表末尾
    const newQueue = [
      ...musicQueue,
      {
        ...musicItem,
        [timeStampSymbol]: Date.now(),
        [sortIndexSymbol]: 0,
      },
    ];
    setMusicQueue(newQueue);
    playIndex(newQueue.length - 1, options);
  }
}

function clearQueue() {
    trackPlayer.clear();
    setMusicQueue([]);
    setCurrentMusic(null);
    currentIndex = -1;
}