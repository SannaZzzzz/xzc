interface RecorderCallbacks {
  onStart?: () => void;
  onStop?: (audioBlob: Blob) => void;
  onError?: (error: Error) => void;
  onDataAvailable?: (data: Blob) => void;
}

class VoiceRecorder {
  private static instance: VoiceRecorder;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private callbacks: RecorderCallbacks = {};
  private isRecording: boolean = false;

  private constructor() {}

  public static getInstance(): VoiceRecorder {
    if (!VoiceRecorder.instance) {
      VoiceRecorder.instance = new VoiceRecorder();
    }
    return VoiceRecorder.instance;
  }

  public async start(callbacks: RecorderCallbacks = {}): Promise<void> {
    if (this.isRecording) {
      return;
    }

    this.callbacks = callbacks;
    this.audioChunks = [];

    try {
      // 请求麦克风权限
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 创建MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      
      // 设置事件处理
      this.mediaRecorder.onstart = () => {
        this.isRecording = true;
        this.callbacks.onStart?.();
      };
      
      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        
        // 合并所有音频块
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
        this.callbacks.onStop?.(audioBlob);
        
        // 关闭媒体流
        this.stopMediaTracks();
      };
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.callbacks.onDataAvailable?.(event.data);
        }
      };
      
      // 开始录音
      this.mediaRecorder.start();
    } catch (error) {
      this.isRecording = false;
      console.error('语音录入错误:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  public stop(): void {
    if (!this.isRecording || !this.mediaRecorder) {
      return;
    }

    try {
      this.mediaRecorder.stop();
    } catch (error) {
      console.error('停止录音错误:', error);
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.stopMediaTracks();
    }
  }

  public isActive(): boolean {
    return this.isRecording;
  }

  private stopMediaTracks(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}

export default VoiceRecorder; 