import CryptoJS from 'crypto-js';
import axios from 'axios';

// 更新配置接口，支持使用后端API
interface XFYunConfig {
  APPID?: string;
  APISecret?: string;
  APIKey?: string;
  useBackendApi?: boolean;
}

interface XFYunBackendResponse {
  url: string;
  appId: string;
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
  // 临时存储后端API返回的APPID
  private backendAppId: string = '';

  constructor(config: XFYunConfig) {
    this.config = config;
  }

  // 从后端API获取WebSocket连接信息
  private async getWebsocketInfoFromBackend(): Promise<XFYunBackendResponse> {
    try {
      const response = await axios.get('/api/tts');
      if (response.data && response.data.url) {
        return response.data;
      }
      throw new Error('后端API返回格式错误');
    } catch (error) {
      console.error('获取TTS连接信息失败:', error);
      throw error;
    }
  }

  // 兼容旧版本的本地生成WebSocket URL方法（不推荐使用）
  private getWebsocketUrlLocally(): string {
    if (!this.config.APISecret || !this.config.APIKey) {
      throw new Error('本地模式需要APISecret和APIKey配置');
    }
    
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
    return new Promise(async (resolve, reject) => {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      try {
        let url = '';
        
        // 根据配置决定是使用后端API还是本地生成连接信息
        if (this.config.useBackendApi) {
          // 从后端API获取连接信息
          const response = await this.getWebsocketInfoFromBackend();
          url = response.url;
          this.backendAppId = response.appId;
        } else {
          // 使用本地方法生成连接信息（不推荐）
          url = this.getWebsocketUrlLocally();
        }

      this.ws = new WebSocket(url);
      
      // 存储音频数据
      const audioChunks: Int16Array[] = [];
      let totalLength = 0;
      
      this.ws.onopen = () => {
        this.status = 'play';
        const params = {
          common: {
              app_id: this.config.useBackendApi ? this.backendAppId : this.config.APPID,
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
      } catch (error) {
        console.error('WebSocket连接失败:', error);
        reject(error);
      }
    });
  }

  public close(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}
