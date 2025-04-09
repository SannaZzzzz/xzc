import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import formidable from 'formidable';
import fs from 'fs';
import { File } from 'formidable';

// 禁用默认的bodyParser，以便我们可以使用formidable处理表单数据
export const config = {
  api: {
    bodyParser: false,
  },
};

// 工具函数：将File对象转换为Buffer
const fileToBuffer = async (file: File): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = fs.createReadStream(file.filepath);
    const chunks: Buffer[] = [];
    
    reader.on('data', (chunk: string | Buffer) => {
      // 如果chunk是string，转换为Buffer；如果已经是Buffer，直接使用
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      chunks.push(buffer);
    });
    reader.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    reader.on('error', reject);
  });
};

// 工具函数：获取百度访问令牌
const getBaiduToken = async (): Promise<string> => {
  const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
  const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

  if (!BAIDU_API_KEY || !BAIDU_SECRET_KEY) {
    throw new Error('百度API密钥未配置');
  }

  try {
    const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;
    const response = await axios.post(tokenUrl);
    
    if (response.data && response.data.access_token) {
      return response.data.access_token;
    } else {
      throw new Error('获取百度访问令牌失败');
    }
  } catch (error) {
    console.error('获取百度访问令牌失败:', error);
    throw error;
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  try {
    // 使用formidable解析表单数据
    const form = formidable({});
    
    const [fields, files] = await form.parse(req) as [formidable.Fields, formidable.Files];
    
    const audioFile = files.audio?.[0];
    const isFinal = fields.isFinal?.[0] === 'true';
    
    if (!audioFile) {
      return res.status(400).json({ error: '未找到音频文件' });
    }
    
    // 将文件转换为Buffer
    const audioBuffer = await fileToBuffer(audioFile);
    
    // 获取百度访问令牌
    const accessToken = await getBaiduToken();
    
    // 准备发送到百度的数据
    const apiUrl = `https://vop.baidu.com/server_api?dev_pid=1537&cuid=abyss_mobile_device`;
    
    // 发送音频数据到百度API
    const response = await axios.post(apiUrl, {
      format: 'pcm',
      rate: 16000,
      channel: 1,
      cuid: 'abyss_mobile_device',
      token: accessToken,
      len: audioBuffer.length,
      speech: audioBuffer.toString('base64'),
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.data && response.data.result) {
      // 返回识别结果
      return res.status(200).json({
        result: response.data.result[0],
        isFinal: isFinal,
      });
    } else {
      console.error('百度语音识别失败:', response.data);
      return res.status(500).json({ error: '语音识别失败' });
    }
  } catch (error) {
    console.error('处理语音识别请求失败:', error);
    return res.status(500).json({ error: '服务器内部错误' });
  }
} 