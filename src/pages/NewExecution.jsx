import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { WorkflowEditor } from '../components/WorkflowEditor'
import { AIAssistant } from '../components/AIAssistant'
import { checkApiAvailable, mockApi } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'

const EXAMPLE_PROGRAM = `# AI 新闻分析助手
# 功能：自动采集、分析、生成报告

input topic: "AI 最新进展"
input language: "中文"

# 定义 Agent
agent collector:
  model: glm-4-flash
  prompt: "从多个来源收集相关信息"

agent analyst:
  model: glm-4-flash
  prompt: "分析数据，提取关键信息"

# 第一步：并行采集
parallel:
  news = session "采集最新新闻"
  trends = session "采集趋势数据"
  social = session "采集社交媒体"

# 第二步：分析
session: analyst
  context: news

# 第三步：条件判断
if **high_priority**:
  session "深度分析"
else:
  session "快速摘要"

# 错误处理
try:
  session "生成报告"
catch as err:
  session "生成备用报告"
finally:
  session "发送通知"

output report = session "输出结论"`

export function NewExecution() {
  const [program, setProgram] = useState(EXAMPLE_PROGRAM)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [splitRatio, setSplitRatio] = useState(45)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  const handleCreate = async () => {
    if (!program.trim()) {
      setError('请输入工作流代码')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const apiAvailable = await checkApiAvailable()
      if (apiAvailable) {
        const res = await fetch(`${API_BASE}/api/executions`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ program, name: name || '新执行任务' })
        })

        if (res.ok) {
          const data = await res.json()
          navigate(`/console/executions/${data.execution.id}`)
        } else {
          const mockId = `exec_${Date.now()}`
          navigate(`/console/executions/${mockId}`)
        }
      } else {
        const data = await mockApi.createExecution({ program, name: name || '新执行任务' })
        navigate(`/console/executions/${data.execution.id}`)
      }
    } catch (err) {
      const mockId = `exec_${Date.now()}`
      navigate(`/console/executions/${mockId}`)
    }
  }

  const loadExample = () => {
    setProgram(EXAMPLE_PROGRAM)
  }

  const clearEditor = () => {
    setProgram('')
  }

  const handleAIInsert = (code) => {
    const textarea = document.querySelector('textarea')
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = program.substring(0, start)
      const after = program.substring(end)
      const newProgram = before + (before && !before.endsWith('\n') ? '\n' : '') + code + (after && !after.startsWith('\n') ? '\n' : '') + after
      setProgram(newProgram)
      setTimeout(() => {
        textarea.focus()
        const newPos = start + code.length + (before && !before.endsWith('\n') ? 1 : 0)
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      setProgram(program + (program && !program.endsWith('\n') ? '\n' : '') + code + '\n')
    }
  }

  const handleAIReplace = (code) => {
    setProgram(code)
  }

  const handleAIAppend = (code) => {
    setProgram(program + (program && !program.endsWith('\n') ? '\n' : '') + code)
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(25, Math.min(70, (x / rect.width) * 100))
    setSplitRatio(ratio)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div className="h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">新建执行</h1>
          <p className="text-gray-500 text-sm">描述需求，AI 生成工作流代码</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadExample}
            className="px-4 py-2 text-sm text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition border border-violet-200"
          >
            📄 加载示例
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !program.trim()}
            className="px-6 py-2 text-sm bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-violet-500/30"
          >
            {loading ? '创建中...' : '▶ 创建执行'}
          </button>
        </div>
      </div>

      {/* Main Split View */}
      <div 
        ref={containerRef}
        className="flex h-[calc(100%-80px)] rounded-2xl overflow-hidden"
        style={{ 
          cursor: isDragging ? 'col-resize' : 'default',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
        }}
      >
        {/* Left: AI Chat - Subtle */}
        <div 
          className="flex flex-col h-full bg-slate-50 border-r border-slate-200"
          style={{ width: `${splitRatio}%` }}
        >
          {/* AI Section Header */}
          <div className="px-5 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">AI 助手</div>
              <div className="text-xs text-gray-500">描述需求，自动生成代码</div>
            </div>
          </div>
          
          {/* AI Chat Content */}
          <div className="flex-1 min-h-0">
            <AIAssistant
              onInsert={handleAIInsert}
              onReplace={handleAIReplace}
              onAppend={handleAIAppend}
              currentCode={program}
            />
          </div>
        </div>

        {/* Divider */}
        <div
          className={`group relative w-1.5 flex-shrink-0 transition-all duration-200 ${
            isDragging ? 'bg-violet-500' : 'bg-slate-200 hover:bg-violet-400'
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center transition-all group-hover:shadow-xl group-hover:border-violet-300">
            <div className="flex flex-col gap-0.5">
              <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-violet-500 transition-colors" />
              <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-violet-500 transition-colors" />
              <div className="w-1 h-1 bg-slate-400 rounded-full group-hover:bg-violet-500 transition-colors" />
            </div>
          </div>
        </div>

        {/* Right: Editor - Bright and Prominent */}
        <div 
          className="flex flex-col min-w-0 bg-gradient-to-br from-white to-violet-50"
          style={{ width: `${100 - splitRatio}%` }}
        >
          {/* Editor Section Header */}
          <div className="px-5 py-4 bg-white border-b border-violet-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full bg-red-400 shadow-sm" />
                <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 shadow-sm" />
                <div className="w-3.5 h-3.5 rounded-full bg-green-400 shadow-sm" />
              </div>
              <span className="text-sm text-gray-700 font-semibold">workflow.prose</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-violet-500 bg-violet-50 px-2 py-1 rounded-md border border-violet-200">Prose</span>
              <button
                onClick={clearEditor}
                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                清空
              </button>
            </div>
          </div>

          {/* Editor Content - Bright */}
          <div className="flex-1 min-h-0 p-5 bg-gradient-to-br from-violet-25/50 to-white">
            <div className="h-full rounded-xl overflow-hidden shadow-lg ring-1 ring-violet-200/50 bg-white border border-violet-100">
              <WorkflowEditor
                value={program}
                onChange={setProgram}
                placeholder="输入 .prose 工作流代码，或让 AI 帮你生成..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 px-6 py-4 bg-red-500 text-white rounded-xl shadow-lg flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
    </div>
  )
}
