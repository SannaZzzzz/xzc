import React, { useEffect, useState } from 'react';
import SpeechRecognitionService from '../utils/speechRecognition';
import BaiduASR from '../utils/baiduASR';

interface SpeechRecognitionProps {
  onResult: (transcript: string) => void;
  isListening: boolean;
  setIsListening: (isListening: boolean) => void;
}

const SpeechRecognition: React.FC<SpeechRecognitionProps> = ({ 
  onResult, 
  isListening,
  setIsListening
}) => {
  const [error, setError] = useState<string>('');
  const [animationFrame, setAnimationFrame] = useState(0);
  const [transcript, setTranscript] = useState<string>(''); // 存储最终识别结果
  const [interimResult, setInterimResult] = useState<string>(''); // 当前识别会话的临时结果
  const [accumulatedText, setAccumulatedText] = useState<string>(''); // 累积的识别文本
  const [sessionDuration, setSessionDuration] = useState<number>(0); // 会话持续时间（秒）
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isUsingBaidu, setIsUsingBaidu] = useState<boolean>(false);
  const [speechService] = useState(() => SpeechRecognitionService.getInstance());
  const [baiduService] = useState(() => BaiduASR.getInstance());

  // 检测设备类型
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        window.navigator.userAgent
      );
      setIsMobile(isMobileDevice);
    }
  }, []);

  // 麦克风动画效果
  useEffect(() => {
    let frameId: number;
    
    if (isListening) {
      const animate = () => {
        setAnimationFrame(prev => (prev + 1) % 3);
        frameId = requestAnimationFrame(animate);
      };
      
      frameId = requestAnimationFrame(animate);
    }
    
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [isListening]);

  // 会话持续时间计时器
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    
    if (isListening) {
      setSessionDuration(0);
      
      timerId = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      setSessionDuration(0);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [isListening]);

  // 控制语音识别状态
  useEffect(() => {
    if (!isListening) {
      // 停止所有服务
      if (isUsingBaidu) {
        baiduService.stopRecognition();
      } else {
        speechService.stopListening();
      }
      return;
    }

    // 开始新识别会话时清空临时识别结果
    setInterimResult('');
    setAccumulatedText('');

    // 移动端先尝试使用百度语音识别
    if (isMobile) {
      try {
        baiduService.startRecognition({
          onStart: () => {
            console.log('百度语音识别已启动');
            setIsUsingBaidu(true);
            setError('');
          },
          onResult: (text, isFinal) => {
            if (!isFinal) {
              setInterimResult(text);
            }
            setAccumulatedText(text);
          },
          onEnd: (finalText) => {
            console.log('百度语音识别完成，结果:', finalText);
            if (finalText && finalText.trim()) {
              setTranscript(finalText);
              onResult(finalText);
            } else if (!finalText.trim()) {
              setError('未能识别您的语音，请重试。');
            }
            setIsListening(false);
          },
          onError: (err) => {
            console.error('百度语音识别错误:', err);
            // 百度API失败，回退到Web Speech API
            setIsUsingBaidu(false);
            setError('百度语音识别失败，正在尝试备用服务...');
            
            // 延迟一点再尝试Web Speech API
            setTimeout(() => {
              startWebSpeechRecognition();
            }, 500);
          }
        });
      } catch (error) {
        console.error('启动百度语音识别失败:', error);
        setIsUsingBaidu(false);
        // 百度API初始化失败，回退到Web Speech API
        startWebSpeechRecognition();
      }
    } else {
      // 桌面端使用Web Speech API
      startWebSpeechRecognition();
    }

    return () => {
      // 组件卸载时停止所有服务
      baiduService.stopRecognition();
      speechService.stopListening();
    };
  }, [isListening, onResult, setIsListening, isMobile]);

  // 启动Web Speech API识别
  const startWebSpeechRecognition = () => {
    // 检查Web Speech API支持
    if (!speechService.isSupported()) {
      setError('您的浏览器不支持语音识别功能。请使用Chrome或Edge浏览器。');
      setIsListening(false);
      return;
    }

    // 启动Web Speech API
    speechService.startListening({
      onStart: () => {
        console.log('Web语音识别已启动');
        setError('');
      },
      onResult: (text, isFinal) => {
        if (!isFinal) {
          setInterimResult(text);
        }
      },
      onEnd: (finalText) => {
        console.log('Web语音识别完成，结果:', finalText);
        if (finalText && finalText.trim()) {
          setTranscript(finalText);
          onResult(finalText);
        } else if (!finalText.trim()) {
          setError('未能识别您的语音，请重试。');
        }
        setIsListening(false);
      },
      onError: (err) => {
        if (err === 'no-speech') return;
        
        console.error('Web语音识别错误:', err);
        setError(`语音识别错误: ${err}`);
        setIsListening(false);
      }
    });
  };

  // 渲染麦克风波纹动画
  const renderMicWaves = () => {
    if (!isListening) return null;
    
    return (
      <div className="absolute -inset-4 z-0 pointer-events-none">
        <div className={`absolute inset-0 rounded-full bg-tech-blue opacity-10 scale-${100 + animationFrame * 20} animate-pulse-slow`}></div>
        <div className={`absolute inset-0 rounded-full bg-tech-blue opacity-10 scale-${110 + animationFrame * 15} animate-pulse`}></div>
      </div>
    );
  };

  // 切换语音识别
  const toggleSpeechRecognition = () => {
    console.log('语音按钮被点击，当前状态:', isListening ? '正在听' : '未开始');
    setIsListening(!isListening);
  };

  // 格式化会话时长
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // 获取当前使用的服务名称
  const getServiceName = (): string => {
    if (!isListening) return '';
    return isUsingBaidu ? '百度语音识别' : 'Web语音识别';
  };

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <button
          onClick={toggleSpeechRecognition}
          className={`relative px-5 py-2 sm:px-6 sm:py-3 rounded-full text-white font-medium transition-all duration-300 ${
            isListening 
              ? 'bg-red-600 animate-pulse shadow-neon-hover' 
              : 'bg-tech-blue hover:bg-tech-blue/90 shadow-neon'
          }`}
        >
          {renderMicWaves()}
          <div className="flex items-center justify-center relative z-10">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`w-5 h-5 mr-2 ${isListening ? 'animate-pulse' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
              />
            </svg>
            {isListening ? '点击结束录音' : '开始语音输入'}
          </div>
        </button>
        <div className="text-xs text-gray-400 text-center sm:text-right">
          {isListening ? (
            <div className="flex flex-col">
              <span className="animate-pulse">
                正在录音... {formatDuration(sessionDuration)} 
                {getServiceName() && <span className="text-green-400 ml-1">[{getServiceName()}]</span>}
              </span>
              <span className="text-green-400 text-xs">说完后点击按钮结束</span>
            </div>
          ) : (
            '点击按钮开始语音输入'
          )}
        </div>
      </div>
      
      {/* 临时识别结果 */}
      {isListening && interimResult && (
        <div className="mt-2 p-2 bg-gray-800/50 border border-gray-700/50 rounded-md">
          <p className="text-xs text-gray-300">
            <span className="font-medium">正在识别:</span> {interimResult}
          </p>
        </div>
      )}
      
      {/* 累积识别结果，在录音过程中显示 */}
      {isListening && accumulatedText && (
        <div className="mt-2 p-2 bg-gray-900/80 border border-tech-blue/30 rounded-md">
          <p className="text-xs text-tech-blue-light">
            <span className="font-medium">累积内容:</span> {accumulatedText}
          </p>
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-500/30 rounded-md text-sm text-red-200">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        </div>
      )}
      
      {transcript && !isListening && (
        <div className="mt-2 text-xs text-gray-400">
          <span className="font-medium">识别内容:</span> {transcript}
        </div>
      )}
    </div>
  );
};

export default SpeechRecognition;

// 为TypeScript定义全局类型
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}