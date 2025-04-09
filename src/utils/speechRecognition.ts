interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onEnd?: (finalText: string) => void;
  onError?: (error: any) => void;
}

class SpeechRecognitionService {
  private static instance: SpeechRecognitionService;
  private recognition: any = null;
  private isListening: boolean = false;
  private shouldContinue: boolean = false; // 是否应继续监听
  private callbacks: SpeechRecognitionCallbacks = {};
  private accumulatedText: string = '';  // 添加累积文本
  private currentSession: string = '';   // 当前会话临时文本

  private constructor() {
    // 检查浏览器支持
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.configureRecognition();
      }
    }
  }

  public static getInstance(): SpeechRecognitionService {
    if (!SpeechRecognitionService.instance) {
      SpeechRecognitionService.instance = new SpeechRecognitionService();
    }
    return SpeechRecognitionService.instance;
  }

  private configureRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'zh-CN';

    this.recognition.onstart = () => {
      console.log('语音识别开始');
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      // 获取当前识别结果
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const isFinal = result.isFinal;
      
      // 更新当前会话文本
      this.currentSession = transcript;
      
      // 如果是最终结果，添加到累积文本
      if (isFinal) {
        this.accumulatedText += ' ' + transcript;
        this.accumulatedText = this.accumulatedText.trim();
      }
      
      // 调用回调，发送当前会话文本和累积文本
      this.callbacks.onResult?.(this.currentSession, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      // 如果是"no-speech"错误，不触发错误回调，继续监听
      if (event.error === 'no-speech') {
        console.log('未检测到语音，继续监听...');
        return;
      }
      this.callbacks.onError?.(event.error);
    };

    this.recognition.onend = () => {
      console.log('语音识别自动结束，shouldContinue:', this.shouldContinue);
      
      // 如果应该继续，则重新启动识别
      if (this.shouldContinue) {
        try {
          console.log('重新启动语音识别...');
          this.recognition.start();
        } catch (error) {
          console.error('重新启动语音识别失败:', error);
          this.isListening = false;
          this.shouldContinue = false;
          this.callbacks.onError?.(error);
        }
      } else {
        // 用户手动停止，返回完整结果
        this.isListening = false;
        this.callbacks.onEnd?.(this.accumulatedText);
      }
    };
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(callbacks: SpeechRecognitionCallbacks = {}): void {
    if (!this.recognition) {
      callbacks.onError?.('浏览器不支持语音识别');
      return;
    }

    if (this.isListening) {
      return;
    }

    this.callbacks = callbacks;
    this.accumulatedText = '';  // 开始新的识别时清空累积文本
    this.currentSession = '';   // 清空当前会话文本
    this.shouldContinue = true; // 设置为应该继续监听
    
    try {
      this.recognition.start();
    } catch (error) {
      console.error('启动语音识别失败:', error);
      this.callbacks.onError?.(error);
    }
  }

  public stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    // 设置为不应继续监听
    this.shouldContinue = false;
    
    try {
      this.recognition.stop();
    } catch (error) {
      console.error('停止语音识别失败:', error);
      this.callbacks.onError?.(error);
      
      // 即使停止失败，也要手动触发结束回调
      this.isListening = false;
      this.callbacks.onEnd?.(this.accumulatedText);
    }
  }

  public isActive(): boolean {
    return this.isListening;
  }

  public toggleListening(callbacks: SpeechRecognitionCallbacks = {}): void {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening(callbacks);
    }
  }
}

export default SpeechRecognitionService; 