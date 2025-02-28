import { ApiResponse, ApiMessage } from '../types/chat'

const API_BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions'

export class ApiClient {
  private token: string

  constructor(token: string) {
    this.token = token
  }

  async *chatStream(message: string, history: ApiMessage[] = []): AsyncGenerator<string, void, unknown> {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
          messages: [
            {
              role: 'system',
              content: `我是一位专业的Processing创意编程教师，拥有丰富的教学经验。我专注于：

1. Processing基础知识讲解：
- 图形绘制基础（点、线、形状）
- 颜色和样式处理
- 动画和交互设计
- 数学和物理模拟

2. 创意编程概念教学：
- 生成艺术原理
- 算法艺术设计
- 交互设计模式
- 视觉效果创作

3. 编程思维培养：
- 逻辑思维训练
- 问题分解能力
- 创造性解决方案
- 代码优化和重构

我会以友好、耐心的方式回答问题，并：
- 提供清晰的代码示例
- 解释关键概念
- 鼓励创新思维
- 给出实用的练习建议
- 分享创意项目灵感

让我们一起探索Processing的创意世界！`
            },
            ...history,
            {
              role: 'user',
              content: message
            }
          ],
          stream: true,
          max_tokens: 2000,
          temperature: 0.7,
          top_p: 0.7
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '请求失败')
      }

      if (!response.body) {
        throw new Error('响应体为空')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          // 将新的数据添加到缓冲区
          buffer += decoder.decode(value, { stream: true })

          // 处理缓冲区中的完整数据行
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // 保存不完整的最后一行

          for (const line of lines) {
            const trimmedLine = line.trim()
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue

            const data = trimmedLine.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0]?.delta?.content || ''
              if (content) {
                // 立即yield每个文本片段
                yield content
              }
            } catch (e) {
              console.error('解析数据失败:', e)
            }
          }
        }

        // 处理最后可能剩余的数据
        if (buffer) {
          const trimmedLine = buffer.trim()
          if (trimmedLine && trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6)
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices[0]?.delta?.content || ''
                if (content) {
                  yield content
                }
              } catch (e) {
                console.error('解析最终数据失败:', e)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('流式请求错误:', error)
      throw error
    }
  }

  // 保留原来的非流式方法作为备份
  async chat(message: string, history: ApiMessage[] = [], retries = 3): Promise<ApiResponse> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
            messages: [
              {
                role: 'system',
                content: `我是一位专业的Processing创意编程教师，拥有丰富的教学经验。我专注于：

1. Processing基础知识讲解：
- 图形绘制基础（点、线、形状）
- 颜色和样式处理
- 动画和交互设计
- 数学和物理模拟

2. 创意编程概念教学：
- 生成艺术原理
- 算法艺术设计
- 交互设计模式
- 视觉效果创作

3. 编程思维培养：
- 逻辑思维训练
- 问题分解能力
- 创造性解决方案
- 代码优化和重构

我会以友好、耐心的方式回答问题，并：
- 提供清晰的代码示例
- 解释关键概念
- 鼓励创新思维
- 给出实用的练习建议
- 分享创意项目灵感

让我们一起探索Processing的创意世界！`
              },
              ...history,
              {
                role: 'user',
                content: message
              }
            ],
            stream: false,
            max_tokens: 2000,
            temperature: 0.7,
            top_p: 0.7
          })
        })

        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || '请求失败')
        }

        // 从API响应中提取文本内容
        const content = data.choices[0]?.message?.content || ''
        
        return {
          text: content
        }
      } catch (error) {
        if (i === retries - 1) {
          return {
            text: '',
            error: error instanceof Error ? error.message : '未知错误'
          }
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    // 添加默认返回值
    return {
      text: '',
      error: '请求失败，请稍后重试'
    }
  }
} 