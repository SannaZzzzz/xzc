import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持POST请求' });
  }

  try {
    // 获取服务器端存储的API密钥（不会暴露给客户端）
    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.error('API密钥未配置');
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    // 从请求体中获取必要参数
    const { messages, temperature } = req.body;

    if (!messages) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    console.log('准备调用DeepSeek API');
    console.log('消息数量:', messages.length);
    
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
      // 服务器响应了但状态码不在2xx范围内
      console.error('错误响应状态:', error.response.status);
      console.error('错误响应数据:', JSON.stringify(error.response.data));
      
      return res.status(error.response.status).json({
        error: '调用DeepSeek API失败',
        details: error.response.data
      });
    } else if (error.request) {
      // 请求已发送但没收到响应
      console.error('未收到响应的请求:', error.request);
      return res.status(500).json({ 
        error: '未收到API响应',
        message: '服务器未响应，请检查网络连接'
      });
    }
    
    // 其他错误
    return res.status(500).json({ 
      error: '服务器内部错误', 
      message: error.message || '未知错误' 
    });
  }
}