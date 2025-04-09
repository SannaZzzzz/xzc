import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 添加详细日志
    console.log('=== DeepSeek API路由被调用 ===');
    console.log('请求方法:', req.method);
    console.log('请求体类型:', typeof req.body);
    
    // 检查req.body是否为空对象
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('请求体为空');
      return res.status(400).json({ error: '请求体不能为空' });
    }
    
    const fullRequestBody = JSON.stringify(req.body);
    console.log('完整请求体:', fullRequestBody);
    
    // 只允许POST请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '仅支持POST请求' });
    }

    // 获取服务器端存储的API密钥（不会暴露给客户端）
    const apiKey = process.env.DEEPSEEK_API_KEY;

    // 添加日志，检查API密钥是否存在
    console.log('DeepSeek API密钥是否存在:', !!apiKey);
    
    if (!apiKey) {
      console.error('DeepSeek API密钥未配置 - 请在Vercel中设置DEEPSEEK_API_KEY环境变量');
      return res.status(500).json({ 
        error: 'DeepSeek API密钥未配置', 
        message: '请在Vercel设置中配置DEEPSEEK_API_KEY环境变量',
        documentation: 'https://vercel.com/docs/concepts/projects/environment-variables'
      });
    }

    // 从请求体中获取必要参数
    let messages = req.body.messages;
    const temperature = req.body.temperature;
    
    // 如果使用了testMode，检查是否存在一个隐藏的消息数组
    if (req.body.testMode === true && (!messages || messages.length === 0)) {
      console.log('检测到testMode，查找可能隐藏的消息');
      
      // 检查请求体中是否有其他位置存储了消息
      for (const key in req.body) {
        if (key !== 'messages' && key !== 'temperature' && key !== 'testMode') {
          const value = req.body[key];
          if (Array.isArray(value) && value.length > 0) {
            console.log(`找到可能的消息数组: ${key}:`, JSON.stringify(value));
            
            // 检查是否符合消息格式
            if (value[0].role && value[0].content) {
              messages = value;
              console.log('使用找到的消息数组替代空messages');
              break;
            }
          }
        }
      }
    }

    if (!messages) {
      console.error('找不到任何消息数组');
      return res.status(400).json({ error: '缺少必要参数messages' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      console.error('消息数组为空或不是数组:', typeof messages);
      return res.status(400).json({ 
        error: '消息数组为空', 
        message: 'messages必须是非空数组'
      });
    }

    // 记录每条消息的详细内容
    console.log('消息数量:', messages.length);
    for (let i = 0; i < messages.length; i++) {
      console.log(`消息 ${i+1}:`, JSON.stringify(messages[i]));
    }
    
    // 创建请求数据，排除任何额外属性
    const requestData = {
      model: 'deepseek-chat',
      messages: messages,
      temperature: temperature || 0.7
    };
    
    console.log('开始调用DeepSeek API，请求数据:', JSON.stringify(requestData));
    
    // 调用DeepSeek API
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000
      }
    );

    console.log('DeepSeek API调用成功');
    
    // 返回API响应
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('DeepSeek API调用失败:', error.message);
    
    // 提供详细的错误信息
    if (error.response) {
      // 服务器响应了但状态码不在2xx范围内
      console.error('API错误响应状态:', error.response.status);
      console.error('API错误响应数据:', JSON.stringify(error.response.data));
      
      return res.status(error.response.status).json({
        error: '调用DeepSeek API失败',
        details: error.response.data,
        message: error.response.data?.error?.message || '服务器返回了错误响应'
      });
    } else if (error.request) {
      // 请求已发送但没收到响应
      console.error('未收到API响应');
      return res.status(500).json({ 
        error: '未收到DeepSeek API响应',
        message: '服务器未响应，请检查网络连接或DeepSeek服务是否可用'
      });
    }
    
    // 其他错误
    return res.status(500).json({ 
      error: '服务器内部错误', 
      message: error.message || '未知错误' 
    });
  }
}