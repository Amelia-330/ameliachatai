'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatMessage, ApiMessage } from './types/chat'
import { ApiClient } from './utils/api'

// 初始化API客户端
const api = new ApiClient(process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY || '')

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 合并两个初始化 useEffect
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      } catch (error) {
        console.error('Error parsing saved messages:', error);
        localStorage.removeItem('chat-messages');
        // 如果读取失败，显示欢迎消息
        setMessages([{
          id: 'system-1',
          content: '你好！我是AI助手，很高兴为您服务。',
          type: 'ai',
          timestamp: new Date()
        }]);
      }
    } else {
      // 如果没有保存的消息，显示欢迎消息
      setMessages([{
        id: 'system-1',
        content: '你好！我是AI助手，很高兴为您服务。',
        type: 'ai',
        timestamp: new Date()
      }]);
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmedInput = inputValue.trim()
    if (!trimmedInput || trimmedInput.length > 2000) {
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: trimmedInput,
      type: 'user',
      timestamp: new Date(),
      status: 'sending'
    }
    
    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)
    
    try {
      const history: ApiMessage[] = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await api.chat(trimmedInput, history)
      
      if (response.error) {
        throw new Error(response.error)
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response.text,
        type: 'ai',
        timestamp: new Date(),
        status: 'sent'
      }

      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'sent' as const } 
            : msg
        ).concat(aiMessage)
      )
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : '服务器错误，请稍后重试',
        type: 'ai',
        timestamp: new Date(),
        status: 'error'
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, status: 'error' as const } 
            : msg
        ).concat(errorMessage)
      )
    } finally {
      setIsLoading(false)
    }
  }, [inputValue, messages])

  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem('chat-messages', JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving messages:', error);
      }
    }
  }, [messages]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  return (
    <main className="min-h-screen bg-[#1a1b1e]">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* 聊天头部 */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-[#1a1b1e] to-[#2c2d31] shadow-lg">
          <h1 className="text-xl font-semibold text-center text-white">AI 智能助手</h1>
          <p className="text-sm text-gray-400 text-center mt-1">
            随时为您解答问题，提供专业帮助
          </p>
        </div>

        {/* 聊天内容区域 */}
        <div className="flex-1 overflow-auto p-6 space-y-8 bg-[#1a1b1e]">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-8">
              <p className="text-lg mb-2">👋 你好！我是你的AI助手</p>
              <p className="text-sm">有任何问题都可以问我</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-4 ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* 头像 */}
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

              {/* 消息内容和时间戳 */}
              <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div
                  className={`p-4 rounded-2xl shadow-lg ${
                    message.type === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                </div>
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
          
          {/* 加载状态显示 */}
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
        </div>

        {/* 底部输入区域 */}
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
                onClick={() => {
                  setMessages([])
                  localStorage.removeItem('chat-messages')
                }}
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
    </main>
  )
}
