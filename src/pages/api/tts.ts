import type { NextApiRequest, NextApiResponse } from 'next';
import CryptoJS from 'crypto-js';

// 仅处理WebSocket连接信息，实际的WebSocket连接仍在客户端进行
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 从服务器环境变量获取配置（不暴露给前端）
    const APPID = process.env.XFYUN_APPID;
    const APISecret = process.env.XFYUN_API_SECRET;
    const APIKey = process.env.XFYUN_API_KEY;

    if (!APPID || !APISecret || !APIKey) {
      return res.status(500).json({ error: '讯飞API配置未完成' });
    }

    // 生成WebSocket URL和授权信息
    const host = 'tts-api.xfyun.cn';
    const date = new Date().toUTCString();
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/tts HTTP/1.1`;
    const signature = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(signatureOrigin, APISecret));
    const authorizationOrigin = `api_key="${APIKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
    const authorization = CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(authorizationOrigin));

    const websocketUrl = `wss://${host}/v2/tts?authorization=${authorization}&date=${encodeURI(date)}&host=${host}`;

    // 返回生成的WebSocket连接信息
    return res.status(200).json({
      url: websocketUrl,
      appId: APPID
    });
  } catch (error: any) {
    console.error('TTS API错误:', error);
    return res.status(500).json({ 
      error: '服务器内部错误', 
      message: error.message || '未知错误' 
    });
  }
}