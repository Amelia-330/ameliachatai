'use client'

import { useState, useRef, useEffect } from 'react'
import { ApiClient } from '../utils/api'

interface Message {
  id: string
  content: string
  type: 'user' | 'ai'
  timestamp: Date
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // 初始化 ApiClient，你需要替换成你的 token
  const apiClient = new ApiClient(process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY || '')

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim()) return

    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      type: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // 创建一个AI消息占位符
    const aiMessageId = (Date.now() + 1).toString()
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      type: 'ai',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, aiMessage])

    try {
      // 使用流式响应
      for await (const chunk of apiClient.chatStream(userMessage.content)) {
        setMessages(prev => prev.map(msg => {
          if (msg.id === aiMessageId) {
            return {
              ...msg,
              content: msg.content + chunk
            }
          }
          return msg
        }))
      }
    } catch {
      // 处理错误情况
      setMessages(prev => prev.map(msg => {
        if (msg.id === aiMessageId) {
          return {
            ...msg,
            content: '抱歉，发生了错误。请稍后重试。'
          }
        }
        return msg
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col bg-[#1a1b1e]">
      {/* 聊天头部 - 使用更精致的深色渐变 */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-[#1a1b1e] to-[#2c2d31] shadow-lg">
        <h1 className="text-xl font-semibold text-center text-white">AI 智能助手</h1>
        <p className="text-sm text-center mt-1 text-gray-400">随时为您解答问题，提供专业帮助</p>
      </div>

      {/* 聊天内容区域 - 优化背景和间距 */}
      <div className="flex-1 overflow-auto p-6 space-y-8 bg-[#1a1b1e]">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-4 ${
              message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* 头像样式 - 使用更柔和的颜色 */}
            <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-3' : 'mr-3'}`}>
              {message.type === 'user' ? (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                  用户
                </div>
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
                  AI
                </div>
              )}
            </div>

            {/* 消息气泡样式 - 优化视觉层次 */}
            <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
              <div
                className={`p-4 rounded-2xl shadow-lg ${
                  message.type === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                }`}
              >
                {/* 结构化展示AI回复内容 - 优化排版 */}
                {message.type === 'ai' ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    {message.content.split('\n').map((line, index) => {
                      // 处理代码块
                      if (line.startsWith('```')) {
                        return (
                          <pre key={index} className="bg-[#1a1b1e] p-4 rounded-lg overflow-x-auto border border-gray-800 my-2">
                            <code className="text-gray-100">{line.replace(/```/g, '')}</code>
                          </pre>
                        );
                      }
                      // 处理列表项
                      if (line.match(/^[*-]\s/)) {
                        return (
                          <li key={index} className="ml-4 text-gray-200">
                            {line.replace(/^[*-]\s/, '')}
                          </li>
                        );
                      }
                      // 处理普通文本
                      return <p key={index} className="text-gray-200 leading-relaxed">{line}</p>;
                    })}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                )}
              </div>
              
              {/* 时间戳样式 - 优化可读性 */}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">
                  {formatTime(message.timestamp)}
                </span>
                {message.type === 'ai' && (
                  <button
                    className="text-xs text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1"
                    onClick={() => {
                      navigator.clipboard.writeText(message.content);
                    }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    复制
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* 加载状态显示 - 优化动画效果 */}
        {isLoading && (
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm shadow-lg">
              AI
            </div>
            <div className="bg-[#2c2d31] p-4 rounded-2xl shadow-lg">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 - 优化交互体验 */}
      <div className="border-t border-gray-800 p-4 bg-[#2c2d31]">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="请输入您的问题..."
            className="flex-1 bg-[#1a1b1e] border border-gray-800 text-gray-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder-gray-500"
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="p-3 text-gray-400 hover:text-gray-200 hover:bg-[#1a1b1e] rounded-xl transition-all"
              onClick={() => setMessages([])}
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? '发送中...' : '发送'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 