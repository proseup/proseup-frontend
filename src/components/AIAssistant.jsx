import { useState, useRef, useEffect } from 'react'

const API_BASE = 'https://api.proseup.cn'

// 系统提示词
const SYSTEM_PROMPT = `你是一个专门帮助用户编写 .prose 工作流的 AI 助手。

.prose 是一种简单的工作流描述语言，支持以下语法：

1. session - 执行一个步骤
   session "任务名称"
   session: agentName

2. agent - 定义可复用的 Agent
   agent researcher:
     model: sonnet
     persist: true
     prompt: "You are a research expert"

3. input/output - 输入输出
   input topic: "要研究的主题"
   output result = session "输出结论"

4. parallel - 并行执行
   parallel:
     a = session "任务A"
     b = session "任务B"

5. repeat/for/loop - 循环
   repeat 3:
     session "执行"
   for item in items:
     session "处理"
   loop until condition:
     session "检查"

6. if/elif/else - 条件分支
   if **condition**:
     session "True分支"
   else:
     session "False分支"

7. try/catch - 异常处理
   try:
     session "可能失败"
   catch as err:
     session "处理错误"
   finally:
     session "清理"

8. choice - AI 决策分支
   choice **severity**:
     option "High":
       session "详细报告"
     option "Low":
       session "简短摘要"

9. block/do - 子程序
   block process(item):
     session "处理"
   do process("data")

10. context - 上下文传递
    context: result

用户可能：
- 用自然语言描述想要的工作流
- 粘贴现有代码让你修改
- 问语法相关问题

请始终用简洁的 .prose 语法回应，不要用 markdown 代码块包裹，直接输出 .prose 代码。

如果用户描述的需求需要多步，可以用 parallel、repeat 等语法组织。

如果用户只是聊天问候，正常回应即可。`

export function AIAssistant({ onInsert, onReplace, currentCode }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 你好！我是 AI 工作流助手。\n\n可以告诉我你想要什么样的工作流，我会帮你生成 .prose 代码。\n\n例如：\n- "帮我写一个数据采集和清洗的工作流"\n- "创建一个循环处理文件的流程"\n- "写一个 AI 研究助手，包含并行搜索和分析"'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showInsert, setShowInsert] = useState(false)
  const [pendingCode, setPendingCode] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // 使用智谱 AI
      const response = await fetch('https://open.bigmodel.cn/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 0841ae7f4dee4a0abe3f104f17ace70c.5rEP3m2fURCtxclx'
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      })

      const data = await response.json()
      
      if (data.choices && data.choices[0]) {
        const aiContent = data.choices[0].message.content.trim()
        
        // 检查是否包含 .prose 代码
        const codeMatch = aiContent.match(/```(?:prose)?\n?([\s\S]*?)```/i)
        const code = codeMatch ? codeMatch[1].trim() : null
        
        if (code) {
          setPendingCode(code)
          setShowInsert(true)
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '我已生成 .prose 代码：\n\n```prose\n' + code + '\n```\n\n你可以选择：\n- 点击「插入」添加到编辑器\n- 点击「替换」替换全部内容\n- 或继续修改需求' 
          }])
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: aiContent }])
        }
      } else {
        throw new Error('Invalid response')
      }
    } catch (err) {
      console.error('AI Error:', err)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，AI 服务暂时不可用。请稍后重试。\n\n或者你也可以手动编写 .prose 代码。' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleInsert = () => {
    if (pendingCode && onInsert) {
      onInsert(pendingCode)
    }
    setShowInsert(false)
    setPendingCode(null)
  }

  const handleReplace = () => {
    if (pendingCode && onReplace) {
      onReplace(pendingCode)
    }
    setShowInsert(false)
    setPendingCode(null)
  }

  const handleCancel = () => {
    setShowInsert(false)
    setPendingCode(null)
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-lg border border-slate-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium text-white">AI 助手</div>
            <div className="text-xs text-slate-400">生成 .prose 工作流</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-violet-600 text-white rounded-br-md' 
                : 'bg-slate-800 text-slate-200 rounded-bl-md'
            }`}>
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 text-slate-400 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
                <span className="text-xs">AI 思考中...</span>
              </div>
            </div>
          </div>
        )}

        {/* Pending Code Actions */}
        {showInsert && pendingCode && (
          <div className="flex justify-start">
            <div className="bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
              <div className="text-sm text-slate-300 mb-3">生成的代码：</div>
              <pre className="text-xs bg-slate-900 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto mb-3 text-slate-300">
                {pendingCode}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={handleInsert}
                  className="flex-1 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium rounded-lg transition"
                >
                  插入到光标位置
                </button>
                <button
                  onClick={handleReplace}
                  className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition"
                >
                  替换全部
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="描述你想要的工作流..."
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-xl transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          按 Enter 发送，Shift+Enter 换行
        </div>
      </div>
    </div>
  )
}
