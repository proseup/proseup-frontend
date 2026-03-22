import { useState, useRef, useEffect } from 'react'

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

用户可能：
- 用自然语言描述想要的工作流
- 粘贴现有代码让你修改
- 问语法相关问题

请始终用简洁的 .prose 语法回应，直接输出 .prose 代码。`

export function AIAssistant({ onInsert, onReplace, onAppend, currentCode }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 你好！告诉我你想要的工作流，我来帮你生成 .prose 代码。\n\n比如：\n- "写一个并行采集数据的工作流"\n- "创建一个 AI 研究助手，包含搜索和分析"\n- "循环处理文件列表"'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingCode, setPendingCode] = useState(null)
  const [showActions, setShowActions] = useState(false)
  const messagesEndRef = useRef(null)

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
          setShowActions(true)
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: '已生成代码：\n\n```prose\n' + code + '\n```\n\n选择操作：' 
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
        content: '抱歉，AI 服务暂时不可用。请稍后重试。' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = (action) => {
    if (!pendingCode) return
    
    if (action === 'insert' && onInsert) {
      onInsert(pendingCode)
    } else if (action === 'replace' && onReplace) {
      onReplace(pendingCode)
    } else if (action === 'append' && onAppend) {
      onAppend(pendingCode)
    }
    
    setShowActions(false)
    setPendingCode(null)
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-gray-900 text-white rounded-br-sm' 
                : 'bg-white text-gray-700 rounded-bl-sm shadow-sm ring-1 ring-gray-200/50'
            }`}>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm ring-1 ring-gray-200/50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                </div>
                <span className="text-xs text-gray-400">AI 思考中...</span>
              </div>
            </div>
          </div>
        )}

        {/* Code Actions */}
        {showActions && pendingCode && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-sm shadow-sm ring-1 ring-gray-200/50 p-4 max-w-[88%]">
              <pre className="text-xs bg-gray-900 text-gray-100 rounded-lg p-3 overflow-x-auto max-h-40 overflow-y-auto mb-3 font-mono">
                {pendingCode}
              </pre>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('insert')}
                  className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition"
                >
                  插入
                </button>
                <button
                  onClick={() => handleAction('replace')}
                  className="flex-1 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition"
                >
                  替换
                </button>
                <button
                  onClick={() => handleAction('append')}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition"
                >
                  追加
                </button>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="描述你想要的工作流..."
            className="flex-1 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-xl transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
