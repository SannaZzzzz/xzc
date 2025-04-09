import axios from 'axios';

interface ASRCallbacks {
  onStart?: () => void;
  onResult?: (text: string, isFinal: boolean) => void;
  onEnd?: (finalText: string) => void;
  onError?: (error: any) => void;
}

/**
 * 百度实时语音识别服务
 */
class BaiduASR {
  private static instance: BaiduASR;
  private isRecognizing: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private accumulatedText: string = '';
  private callbacks: ASRCallbacks = {};
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  
  private constructor() {}
  
  public static getInstance(): BaiduASR {
    if (!BaiduASR.instance) {
      BaiduASR.instance = new BaiduASR();
    }
    return BaiduASR.instance;
  }
  
  /**
   * 获取百度AI平台的访问令牌
   */
  private async getAccessToken(): Promise<string> {
    // 如果有有效的token，直接返回
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      return this.accessToken as string;
    }
    
    try {
      // API密钥在服务器端配置
      const response = await axios.post('/api/baidu/token');
      
      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // 令牌有效期通常为30天，设置为29天以确保安全
        this.tokenExpiry = now + 29 * 24 * 60 * 60 * 1000;
        return this.accessToken as string;
      } else {
        throw new Error('获取访问令牌失败');
      }
    } catch (error) {
      console.error('获取百度访问令牌失败:', error);
      throw error;
    }
  }
  
  /**
   * 开始录音并识别
   */
  public async startRecognition(callbacks: ASRCallbacks = {}): Promise<void> {
    if (this.isRecognizing) return;
    
    this.callbacks = callbacks;
    this.audioChunks = [];
    this.accumulatedText = '';
    
    try {
      this.callbacks.onStart?.();
      
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm'
      });
      
      // 设置事件处理
      this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
      this.mediaRecorder.onstop = this.handleRecordingStop.bind(this);
      
      // 开始录音
      this.mediaRecorder.start(1000); // 每秒收集一次数据
      this.isRecognizing = true;
      
    } catch (error) {
      console.error('语音识别初始化失败:', error);
      this.callbacks.onError?.(error);
      this.cleanup();
    }
  }
  
  /**
   * 处理录音数据
   */
  private async handleDataAvailable(event: BlobEvent): Promise<void> {
    if (event.data.size > 0) {
      this.audioChunks.push(event.data);
      
      try {
        // 将最新的音频块发送到百度API进行识别
        await this.recognizeAudio(event.data);
      } catch (error) {
        console.error('处理音频数据失败:', error);
      }
    }
  }
  
  /**
   * 处理录音结束
   */
  private async handleRecordingStop(): Promise<void> {
    try {
      // 将所有录音数据合并成一个最终的音频文件
      const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // 最终识别
      await this.recognizeAudio(audioBlob, true);
      
      // 通知结束
      this.callbacks.onEnd?.(this.accumulatedText);
    } catch (error) {
      console.error('处理录音结束失败:', error);
      this.callbacks.onError?.(error);
    } finally {
      this.cleanup();
    }
  }
  
  /**
   * 识别音频数据
   */
  private async recognizeAudio(audioBlob: Blob, isFinal: boolean = false): Promise<void> {
    try {
      // 准备发送到API的数据
      const formData = new FormData();
      formData.append('audio', audioBlob);
      formData.append('isFinal', String(isFinal));
      
      // 发送到我们的API端点
      const response = await axios.post('/api/baidu/asr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });
      
      if (response.data && response.data.result) {
        const recognizedText = response.data.result;
        
        // 如果是最终结果，更新累积文本
        if (isFinal) {
          this.accumulatedText = recognizedText;
        }
        
        // 通知结果
        this.callbacks.onResult?.(recognizedText, isFinal);
      }
    } catch (error) {
      console.error('语音识别请求失败:', error);
      if (isFinal) {
        this.callbacks.onError?.(error);
      }
    }
  }
  
  /**
   * 停止录音和识别
   */
  public stopRecognition(): void {
    if (!this.isRecognizing || !this.mediaRecorder) return;
    
    try {
      // 停止MediaRecorder，会触发onstop事件
      this.mediaRecorder.stop();
    } catch (error) {
      console.error('停止录音失败:', error);
      this.callbacks.onError?.(error);
      this.cleanup();
    }
  }
  
  /**
   * 清理资源
   */
  private cleanup(): void {
    this.isRecognizing = false;
    
    // 停止所有媒体轨道
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.mediaRecorder = null;
  }
  
  /**
   * 检查是否正在识别
   */
  public isActive(): boolean {
    return this.isRecognizing;
  }
}

export default BaiduASR; 