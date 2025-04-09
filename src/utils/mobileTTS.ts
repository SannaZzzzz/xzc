import axios from 'axios';

export interface TTSConfig {
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

interface TTSError extends Error {
  code?: string;
  details?: any;
}

class MobileTTS {
  private static instance: MobileTTS;
  private audio: HTMLAudioElement | null = null;
  private onStartCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private config: TTSConfig | null = null;
  private isPlaying: boolean = false;

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
      this.isPlaying = true;
      this.onStartCallback?.();
    });

    this.audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.onEndCallback?.();
    });

    this.audio.addEventListener('error', (e) => {
      const error: TTSError = new Error('音频播放失败');
      error.code = 'AUDIO_PLAYBACK_ERROR';
      error.details = e;
      this.handleError(error);
    });
  }

  private handleError(error: TTSError) {
    console.error('TTS错误:', error);
    if (this.config?.onError) {
      this.config.onError(error);
    }
  }

  public async speak(text: string, config: TTSConfig = {}) {
    this.config = config;  // 保存配置以供错误处理使用
    let retries = 3;
    let lastError: TTSError | null = null;

    // 设置回调函数
    this.onStartCallback = config.onStart || null;
    this.onEndCallback = config.onEnd || null;

    while (retries > 0) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);  // 30秒超时

        // 转换配置参数
        const ttsConfig = {
          spd: config.rate || 4,      // 语速，默认4
          pit: config.pitch || 4,      // 音调，默认4
          vol: config.volume || 5,     // 音量，默认5
          per: config.voice || '5003'   // 发音人，默认为度逍遥
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
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`TTS API请求失败: ${response.status} ${response.statusText}`);
        }

        const audioBlob = await response.blob();
        if (!this.audio) {
          throw new Error('音频播放器初始化失败');
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        this.audio.src = audioUrl;
        
        // 设置加载超时
        const loadTimeout = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('音频加载超时')), 10000);
        });

        // 尝试预加载音频
        try {
          await Promise.race([
            this.audio.load(),
            loadTimeout
          ]);
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
        return;  // 成功则退出重试循环

      } catch (error: any) {
        lastError = error;
        console.warn(`TTS尝试失败 (剩余重试次数: ${retries - 1}):`, error);
        retries--;
        
        if (retries === 0) {
          // 最后一次重试也失败时触发结束回调
          this.onEndCallback?.();
        }
        
        if (retries > 0) {
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    // 所有重试都失败后
    if (lastError) {
      this.handleError(lastError);
      throw lastError;
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