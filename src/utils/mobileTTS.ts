import axios from 'axios';

interface TTSConfig {
  speed?: number;    // 语速，范围0-15
  pitch?: number;    // 音调，范围0-15
  volume?: number;   // 音量，范围0-15
  person?: number;   // 发音人，默认为度逍遥(5003)
}

class MobileTTS {
  private static instance: MobileTTS;
  private audio: HTMLAudioElement | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.setupAudioListeners();
    }
  }

  public static getInstance(): MobileTTS {
    if (!MobileTTS.instance) {
      MobileTTS.instance = new MobileTTS();
    }
    return MobileTTS.instance;
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this.onStartCallback?.();
    });

    this.audio.addEventListener('ended', () => {
      this.onEndCallback?.();
    });

    this.audio.addEventListener('error', (e) => {
      console.error('移动端音频播放错误:', e);
      this.onEndCallback?.();
    });
  }

  public async speak(text: string, config: TTSConfig = {}, callbacks: { onStart?: () => void; onEnd?: () => void } = {}) {
    try {
      this.onStartCallback = callbacks.onStart || null;
      this.onEndCallback = callbacks.onEnd || null;

      // 转换配置参数
      const ttsConfig = {
        spd: config.speed || 4,      // 语速，默认4
        pit: config.pitch || 4,      // 音调，默认4
        vol: config.volume || 5,     // 音量，默认5
        per: config.person || 5003   // 发音人，默认为度逍遥
      };

      const response = await fetch('/api/tts/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...ttsConfig
        }),
      });

      if (!response.ok) {
        throw new Error('TTS API请求失败');
      }

      const audioBlob = await response.blob();
      if (!this.audio) {
        throw new Error('音频播放器初始化失败');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      this.audio.src = audioUrl;
      
      // 尝试预加载音频
      try {
        await this.audio.load();
      } catch (err) {
        console.warn('音频预加载失败，继续尝试播放');
      }

      // 播放音频
      const playPromise = this.audio.play();
      if (playPromise) {
        await playPromise;
      }

      // 清理 URL 对象
      URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.error('移动端TTS处理错误:', error);
      this.onEndCallback?.();
      throw error;
    }
  }

  public stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.onEndCallback?.();
    }
  }
}

export default MobileTTS; 