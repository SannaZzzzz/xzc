import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

// 强化错误处理的API路由处理函数
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 记录访问日志
    console.log('=== DeepSeek API路由被调用 ===');
    console.log('请求方法:', req.method);
    console.log('请求头:', JSON.stringify(req.headers));
    
    // 只允许POST请求
    if (req.method !== 'POST') {
      return res.status(405).json({ error: '仅支持POST请求' });
    }

    try {
      // 检查请求体是否存在
      if (!req.body) {
        console.error('请求体为空');
        return res.status(400).json({ error: '请求体为空' });
      }

      console.log('请求体类型:', typeof req.body);
      console.log('请求体:', JSON.stringify(req.body).substring(0, 200) + '...');

      // 获取服务器端存储的API密钥（不会暴露给客户端）
      const apiKey = process.env.DEEPSEEK_API_KEY;

      // 添加日志，检查API密钥是否存在
      console.log('DeepSeek API密钥是否存在:', !!apiKey);
      console.log('环境变量列表:', Object.keys(process.env).filter(key => !key.includes('SECRET')).join(', '));
      
      if (!apiKey) {
        console.error('DeepSeek API密钥未配置 - 请在Vercel中设置DEEPSEEK_API_KEY环境变量');
        return res.status(500).json({ 
          error: 'DeepSeek API密钥未配置', 
          message: '请在Vercel设置中配置DEEPSEEK_API_KEY环境变量',
          documentation: 'https://vercel.com/docs/concepts/projects/environment-variables'
        });
      }

      // 从请求体中获取必要参数
      const { messages, temperature } = req.body;

      if (!messages) {
        console.error('缺少必要参数messages');
        return res.status(400).json({ error: '缺少必要参数messages' });
      }

      if (!Array.isArray(messages)) {
        console.error('messages参数不是数组');
        return res.status(400).json({ error: 'messages参数必须是数组' });
      }

      console.log('准备调用DeepSeek API，消息数量:', messages.length);
      
      // 使用演示模式响应(临时，用于调试)
      const useDemoResponse = false; // 设置为true可绕过API调用，返回测试响应
      
      if (useDemoResponse) {
        console.log('返回演示响应，跳过API调用');
        return res.status(200).json({
          choices: [
            {
              message: {
                content: "这是一个演示响应。作为桥吊专家，我可以告诉你定期维护是确保设备安全的关键。我有30年经验，见过许多由于忽视小细节导致的事故。记住，安全第一！"
              }
            }
          ]
        });
      }
      
      try {
        // 调用DeepSeek API
        console.log('开始调用DeepSeek API...');
        const response = await axios.post(
          'https://api.deepseek.com/v1/chat/completions',
          {
            model: "deepseek-chat",
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

        console.log('DeepSeek API调用成功，状态码:', response.status);
        console.log('响应数据:', JSON.stringify(response.data).substring(0, 200) + '...');
        
        // 返回API响应
        return res.status(200).json(response.data);
      } catch (apiError: any) {
        console.error('DeepSeek API调用失败:', apiError.message);
        
        if (apiError.response) {
          console.error('API错误响应状态:', apiError.response.status);
          console.error('API错误响应数据:', JSON.stringify(apiError.response.data));
          
          // 检查是否是API密钥无效
          if (apiError.response.status === 401) {
            return res.status(401).json({
              error: 'DeepSeek API密钥无效',
              message: '请检查API密钥是否正确，或者已过期',
              details: apiError.response.data
            });
          }
          
          return res.status(apiError.response.status).json({
            error: '调用DeepSeek API失败',
            details: apiError.response.data,
            message: '服务器返回了错误响应，请检查API密钥是否有效'
          });
        }
        
        return res.status(500).json({
          error: '调用DeepSeek API失败',
          message: apiError.message || '未知错误'
        });
      }
    } catch (routeError: any) {
      console.error('API路由处理错误:', routeError);
      return res.status(500).json({ 
        error: 'API路由处理错误', 
        message: routeError.message || '未知错误' 
      });
    }
  } catch (fatalError: any) {
    // 捕获所有可能的错误，确保API路由不会崩溃
    console.error('API路由致命错误:', fatalError);
    return res.status(500).json({ 
      error: 'API路由致命错误', 
      message: fatalError.message || '未知错误' 
    });
  }
}