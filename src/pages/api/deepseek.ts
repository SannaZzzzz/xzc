import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持POST请求' });
  }

  try {
    // 获取服务器端存储的API密钥（不会暴露给客户端）
    const apiKey = process.env.DEEPSEEK_API_KEY; // 注意这里不使用NEXT_PUBLIC_前缀

    if (!apiKey) {
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    // 从请求体中获取必要参数
    const { messages, temperature } = req.body;

    if (!messages) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    // 调用DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages,
        temperature: temperature || 0.7,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );

    // 返回API响应
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('DeepSeek API错误:', error);
    
    // 提供详细的错误信息
    if (error.response) {
      return res.status(error.response.status).json({
        error: '调用DeepSeek API失败',
        details: error.response.data
      });
    }
    
    return res.status(500).json({ 
      error: '服务器内部错误', 
      message: error.message || '未知错误' 
    });
  }
}