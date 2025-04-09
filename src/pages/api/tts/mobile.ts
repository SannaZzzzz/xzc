import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import rateLimit from 'express-rate-limit';

// 百度TTS配置从环境变量获取
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;
const BAIDU_CUID = process.env.BAIDU_CUID;

// 验证环境变量是否存在
if (!BAIDU_APP_ID || !BAIDU_API_KEY || !BAIDU_SECRET_KEY || !BAIDU_CUID) {
  console.error('缺少百度TTS必要的环境变量配置');
}

// 创建速率限制器
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100 // 每个IP限制100次请求
});

// 缓存token
let cachedToken: { value: string; expireTime: number } | null = null;

// 获取百度TTS的access token
async function getBaiduToken() {
  try {
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      throw new Error('缺少百度TTS API密钥配置');
    }

    // 检查缓存的token是否有效
    if (cachedToken && Date.now() < cachedToken.expireTime) {
      return cachedToken.value;
    }

    const response = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`,
      null,
      {
        timeout: 5000, // 5秒超时
      }
    );

    // 缓存token，设置过期时间为29天（百度token有效期30天）
    cachedToken = {
      value: response.data.access_token,
      expireTime: Date.now() + 29 * 24 * 60 * 60 * 1000
    };

    return response.data.access_token;
  } catch (error) {
    console.error('获取百度Token失败:', error);
    throw new Error('获取语音授权失败');
  }
}

// 验证文本长度
function validateText(text: string): boolean {
  // 限制文本长度不超过1000个字符
  return text.length <= 1000;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 设置响应超时
  res.setTimeout(55000); // 55秒超时，留5秒缓冲

  // 应用速率限制
  await new Promise((resolve) => limiter(req, res, resolve));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    if (!BAIDU_APP_ID || !BAIDU_API_KEY || !BAIDU_SECRET_KEY || !BAIDU_CUID) {
      throw new Error('缺少百度TTS必要的环境变量配置');
    }

    const { text, spd = 4, pit = 4, vol = 5, per = 5003 } = req.body;

    if (!text) {
      return res.status(400).json({ error: '缺少文本参数' });
    }

    // 验证文本长度
    if (!validateText(text)) {
      return res.status(400).json({ error: '文本长度超过限制' });
    }

    // 验证参数范围
    if (spd < 0 || spd > 15 || pit < 0 || pit > 15 || vol < 0 || vol > 15) {
      return res.status(400).json({ error: '参数范围无效' });
    }

    // 获取access token
    const accessToken = await getBaiduToken();

    // 调用百度TTS API
    const response = await axios.post(
      'https://tsn.baidu.com/text2audio',
      {
        tex: text,
        tok: accessToken,
        cuid: BAIDU_CUID,
        ctp: 1,
        lan: 'zh',
        spd: spd,    // 语速，取值0-15，默认为4中等语速
        pit: pit,    // 音调，取值0-15，默认为4中等音调
        vol: vol,    // 音量，取值0-15，默认为5中等音量
        per: per,    // 发音人，默认为度逍遥
        aue: 3       // 3为mp3格式(默认)
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*'
        },
        timeout: 30000, // 30秒超时
        maxContentLength: 10 * 1024 * 1024 // 限制响应大小为10MB
      }
    );

    // 检查是否返回音频数据
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('audio')) {
      // 设置响应头
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // 返回音频数据
      return res.send(response.data);
    } else {
      // 如果返回的不是音频数据，可能是错误信息
      const errorInfo = JSON.parse(response.data.toString());
      throw new Error(errorInfo.error_msg || '语音合成失败');
    }
  } catch (error: any) {
    console.error('百度TTS API错误:', error);
    
    // 细化错误处理
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ error: '请求超时', details: '服务响应时间过长' });
      }
      if (error.response) {
        return res.status(error.response.status).json({
          error: '语音合成失败',
          details: error.response.data?.error_msg || error.message
        });
      }
    }
    
    return res.status(500).json({ 
      error: '语音合成失败',
      details: error.message 
    });
  }
} 