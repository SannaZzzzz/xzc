import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('您的浏览器不支持语音识别功能。请使用Chrome或Edge浏览器。');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = 'zh-CN'; // 设置语言为中文
    recognition.continuous = false; // 设置为非连续模式
    recognition.interimResults = false; // 不返回临时结果

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('语音识别错误:', event.error);
      setError(`语音识别错误: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    // 根据isListening状态开始或停止语音识别
    if (isListening) {
      try {
        recognition.start();
      } catch (e) {
        console.error('启动语音识别失败:', e);
      }
    } else {
      try {
        recognition.stop();
      } catch (e) {
        // 忽略未启动时停止的错误
      }
    }

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // 忽略未启动时停止的错误
      }
    };
  }, [isListening, onResult, setIsListening]);

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

  return (
    <div className="mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <button
          onClick={() => setIsListening(!isListening)}
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
            {isListening ? '正在听...' : '开始语音输入'}
          </div>
        </button>
        <div className="text-xs text-gray-400 text-center sm:text-right animate-pulse-slow">
          {isListening ? '请说话...' : '点击按钮开始语音输入'}
        </div>
      </div>
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