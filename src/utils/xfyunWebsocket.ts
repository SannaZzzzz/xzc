import CryptoJS from 'crypto-js';

interface XFYunConfig {
  APPID: string;
  APISecret: string;
  APIKey: string;
}

interface VoiceCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
}

export class XFYunWebsocket {
  private ws: WebSocket | null = null;
  private config: XFYunConfig;
  private audioContext: AudioContext | null = null;
  private status = 'end';

  constructor(config: XFYunConfig) {
    this.config = config;
  }

  private getWebsocketUrl(): string {
    const host = 'tts-api.xfyun.cn';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
    const signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(signatureOrigin, this.config.APISecret));
    const authorizationOrigin = `api_key="${this.config.APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));
    
    return `wss://${host}/v2/tts?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  public async startSynthesis(text: string, voiceConfig: any = {}, callbacks: VoiceCallbacks = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const url = this.getWebsocketUrl();
      this.ws = new WebSocket(url);
      
      // 存储音频数据
      const audioChunks: Int16Array[] = [];
      let totalLength = 0;
      
      this.ws.onopen = () => {
        this.status = 'play';
        const params = {
          common: {
            app_id: this.config.APPID,
          },
          business: {
            aue: 'raw',
            auf: 'audio/L16;rate=16000',
            vcn: 'x4_lingbosong',
            speed: voiceConfig.speed || 50,
            volume: voiceConfig.volume || 50,
            pitch: voiceConfig.pitch || 50,
            tte: 'UTF8',
          },
          data: {
            status: 2,
            text: CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text)),
          },
        };
        
        if (this.ws) {
          this.ws.send(JSON.stringify(params));
        }
      };

      this.ws.onmessage = async (e) => {
        const data = JSON.parse(e.data);
        
        if (data.code !== 0) {
          this.ws?.close();
          reject(new Error(`合成失败: ${data.message}`));
          return;
        }

        if (data.data?.audio) {
          // 解码Base64音频数据
          const arrayBuffer = this.base64ToArrayBuffer(data.data.audio);
          const chunk = new Int16Array(arrayBuffer);
          audioChunks.push(chunk);
          totalLength += chunk.length;
        }

        if (data.data?.status === 2) {
          this.status = 'end';
          
          // 合并所有音频块
          const mergedArray = new Int16Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            mergedArray.set(chunk, offset);
            offset += chunk.length;
          }
          
          // 转换为浮点数
          const floatData = new Float32Array(mergedArray.length);
          for (let i = 0; i < mergedArray.length; i++) {
            floatData[i] = mergedArray[i] / 32768.0;
          }

          try {
            const buffer = this.audioContext!.createBuffer(1, floatData.length, 16000);
            buffer.getChannelData(0).set(floatData);
            
            const source = this.audioContext!.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext!.destination);
            
            // 添加开始和结束回调
            if (callbacks.onStart) {
              source.addEventListener('playing', callbacks.onStart);
            }
            if (callbacks.onEnd) {
              source.onended = () => {
                callbacks.onEnd?.();
                resolve();
              };
            } else {
              source.onended = () => {
                resolve();
              };
            }
            
            // 触发开始回调并开始播放
            callbacks.onStart?.();
            source.start();
          } catch (error) {
            console.error('音频处理错误:', error);
            reject(error);
          }
        }
      };

      this.ws.onerror = (e) => {
        console.error('WebSocket错误:', e);
        reject(new Error('WebSocket错误'));
      };

      this.ws.onclose = () => {
        this.status = 'end';
      };
    });
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}
