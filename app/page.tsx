'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChatMessage, ApiMessage } from './types/chat'
import { ApiClient } from './utils/api'
import { debounce } from 'lodash'

// 初始化API客户端
const api = new ApiClient(process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY || '')

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('正在思考...')

  // 合并两个初始化 useEffect
  useEffect(() => {
    const savedMessages = localStorage.getItem('chat-messages');
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
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

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto h-screen flex flex-col">
        {/* 聊天头部 */}
        <div className="p-4 border-b bg-white">
          <h1 className="text-xl font-semibold text-center">AI 智能助手</h1>
          <p className="text-sm text-gray-500 text-center mt-1">
            随时为您解答问题，提供专业帮助
          </p>
        </div>

        {/* 聊天内容区域 */}
        <div className="flex-1 overflow-auto p-4 space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg mb-2">👋 你好！我是你的AI助手</p>
              <p className="text-sm">有任何问题都可以问我</p>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* 头像 */}
              <div className={`flex-shrink-0 ${message.type === 'user' ? 'ml-2' : 'mr-2'}`}>
                {message.type === 'user' ? (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm">
                    用户
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                    AI
                  </div>
                )}
              </div>

              {/* 消息内容和时间戳 */}
              <div className={`flex flex-col ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : 'bg-gray-100 rounded-bl-none'
                  }`}
                >
                  {message.content}
                </div>
                <span className="text-xs text-gray-400 mt-1">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm">
                AI
              </div>
              <div className="flex items-center space-x-2 text-gray-500 bg-gray-100 p-3 rounded-lg">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* 底部输入区域 */}
        <div className="border-t p-4 bg-white">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="请输入您的问题..."
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
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
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
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
