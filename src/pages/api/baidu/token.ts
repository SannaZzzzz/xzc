import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// 百度API配置
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
      console.error('百度API密钥未配置');
      return res.status(500).json({ error: '百度API密钥未配置' });
    }

    // 请求百度获取访问令牌
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
    
    const response = await axios.post(tokenUrl);
    
    if (response.data && response.data.access_token) {
      // 返回访问令牌
      return res.status(200).json({
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      });
    } else {
      console.error('获取百度访问令牌失败:', response.data);
      return res.status(500).json({ error: '获取百度访问令牌失败' });
    }
  } catch (error) {
    console.error('获取百度访问令牌出错:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 