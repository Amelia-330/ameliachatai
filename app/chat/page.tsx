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
  const apiClient = new ApiClient('your-token-here')

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
    } catch (_error) {
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
    <div className="max-w-4xl mx-auto h-screen flex flex-col">
      {/* 聊天头部 */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-semibold text-center">AI 助手</h1>
      </div>

      {/* 聊天内容区域 */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
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
                {message.content || (message.type === 'ai' && isLoading && '思考中...')}
              </div>
              <span className="text-xs text-gray-400 mt-1">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} /> {/* 用于自动滚动的参考元素 */}
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
            disabled={isLoading}
          />
          <div className="flex gap-2">
            <button
              type="button"
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              onClick={() => setMessages([])}
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300"
              disabled={isLoading}
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 