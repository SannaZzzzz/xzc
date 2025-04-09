import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// 阿里云百炼的API配置
const ALIBABA_API_KEY = process.env.ALIBABA_API_KEY;

// 创建OpenAI兼容客户端
const openai = new OpenAI({
  apiKey: ALIBABA_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  timeout: 360000, // 设置超时为360秒
  maxRetries: 2   // 最多重试2次
});

/**
 * API处理函数 - 处理调用阿里云百炼API的请求
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 获取User-Agent
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 检查API密钥是否存在
    if (!ALIBABA_API_KEY) {
      console.error('阿里云百炼API密钥不存在');
      return res.status(500).json({ error: 'API密钥未配置' });
    }

    console.log('=== 阿里云百炼API路由被调用 ===');
    console.log('设备类型:', isMobile ? '移动端' : '桌面端');
    console.log('请求方法:', req.method);
    console.log('请求体类型:', typeof req.body);
    // 移动端请求减少日志大小
    if (!isMobile) {
      console.log('完整请求体:', JSON.stringify(req.body));
    }

    // 从请求体中获取参数
    let messages = req.body.messages;
    const temperature = req.body.temperature || 0.7;
    // 移动端使用更轻量级的模型以提高速度
    const defaultModel = isMobile ? 'qwen' : 'qwen-plus';
    const model = req.body.model || defaultModel;

    // 检查消息数组是否存在
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '请求中缺少有效的消息数组' });
    }

    // 记录消息数量和每条消息
    console.log('阿里云百炼API密钥是否存在:', !!ALIBABA_API_KEY);
    console.log('消息数量:', messages.length);
    // 减少控制台日志量
    if (!isMobile) {
      messages.forEach((msg, index) => {
        console.log(`消息 ${index + 1}:`, JSON.stringify(msg));
      });
    }

    console.log('开始调用阿里云百炼API，使用模型:', model);
    console.log('请求开始时间:', new Date().toISOString());

    // 适当减少移动端的prompt长度
    if (isMobile && messages.length > 0 && messages[0].role === 'system') {
      // 截断系统提示，保留核心内容
      const originalSystemPrompt = messages[0].content;
      if (originalSystemPrompt.length > 500) {
        messages[0].content = originalSystemPrompt.substring(0, 500) + '...';
        console.log('移动端请求，系统提示已截断');
      }
    }

    try {
      // 使用OpenAI兼容接口调用百炼API，添加超时配置
      const completion = await openai.chat.completions.create({
        model: model,
        messages: messages,
        temperature: temperature,
      }, {
        timeout: 360000 // 360秒超时，在options参数中设置
      });

      console.log('阿里云百炼API调用成功，请求结束时间:', new Date().toISOString());
      
      // 保持与前端期望的格式一致
      const response = {
        choices: [
          {
            message: {
              content: completion.choices[0].message.content
            }
          }
        ]
      };
      
      return res.status(200).json(response);
    } catch (apiError: any) {
      // 捕获并处理OpenAI库的错误
      console.error('API调用出错类型:', apiError.constructor.name);
      console.error('API调用出错信息:', apiError.message);
      
      // 函数调用超时错误
      if (apiError.message && (
        apiError.message.includes('timeout') || 
        apiError.message.includes('FUNCTION INVOCATION TIMEOUT') ||
        apiError.message.includes('Request timed out')
      )) {
        return res.status(200).json({
          choices: [
            {
              message: {
                content: "抱歉，服务器处理超时。请尝试缩短问题或者稍后再试。作为专业的桥吊专家，我建议您可以将问题拆分为更小的部分，或者直接使用演示模式获取参考回答。"
              }
            }
          ]
        });
      }
      
      if (apiError.response) {
        const errorBody = apiError.response.data;
        console.error('API错误响应体:', errorBody);
        
        return res.status(500).json({
          error: '阿里云百炼API调用失败',
          message: errorBody.error?.message || errorBody.message || '未知API错误',
          code: errorBody.error?.code || errorBody.code || 'UNKNOWN'
        });
      } else {
        // 其他通用错误
        return res.status(500).json({
          error: '阿里云百炼API调用失败',
          message: apiError.message || '未知错误',
          code: apiError.code || 'UNKNOWN'
        });
      }
    }
  } catch (error: any) {
    console.error('处理请求时出错:', error.message);
    console.error('请求结束时间:', new Date().toISOString());
    
    return res.status(500).json({
      error: '处理请求失败',
      message: error.message || '未知系统错误'
    });
  }
} 