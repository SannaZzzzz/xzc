import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// 百度TTS配置 - 仅从环境变量获取，不再提供硬编码默认值
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;
const BAIDU_CUID = process.env.BAIDU_CUID || 'mobile_tts_client';

// 获取百度TTS的access token
async function getBaiduToken() {
  try {
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      throw new Error('缺少百度语音API密钥配置');
    }
    
    const response = await axios.post(
      `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
    );
    return response.data.access_token;
  } catch (error) {
    console.error('获取百度Token失败:', error);
    throw new Error('获取语音授权失败');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 检查必要的环境变量
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      return res.status(500).json({ error: '服务器未正确配置语音合成服务' });
    }

    const { text, spd = 4, pit = 4, vol = 5, per = 5003 } = req.body;

    if (!text) {
      return res.status(400).json({ error: '缺少文本参数' });
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
        per: per,    // 发音人，默认为3
        aue: 3       // 3为mp3格式(默认)
      },
      {
        responseType: 'arraybuffer',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': '*/*'
        }
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
    return res.status(500).json({ 
      error: '语音合成失败',
      details: error.message 
    });
  }
} 