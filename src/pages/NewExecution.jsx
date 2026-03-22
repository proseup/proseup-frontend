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
  const [splitRatio, setSplitRatio] = useState(50) // 50% each side
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

  // AI 插入代码到光标位置
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

  // AI 替换全部代码
  const handleAIReplace = (code) => {
    setProgram(code)
  }

  // AI 追加代码
  const handleAIAppend = (code) => {
    setProgram(program + (program && !program.endsWith('\n') ? '\n' : '') + code)
  }

  // Handle divider drag
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = Math.max(20, Math.min(80, (x / rect.width) * 100))
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
    <div 
      ref={containerRef}
      className="flex h-[calc(100vh-180px)] bg-white rounded-lg shadow overflow-hidden"
      style={{ cursor: isDragging ? 'col-resize' : 'default' }}
    >
      {/* Left: AI Assistant */}
      <div 
        className="flex-shrink-0 border-r border-gray-200"
        style={{ width: `${splitRatio}%` }}
      >
        <AIAssistant
          onInsert={handleAIInsert}
          onReplace={handleAIReplace}
          onAppend={handleAIAppend}
          currentCode={program}
        />
      </div>

      {/* Divider */}
      <div
        className={`w-1.5 flex-shrink-0 bg-gray-200 hover:bg-violet-300 cursor-col-resize transition-colors relative group ${
          isDragging ? 'bg-violet-400' : ''
        }`}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-8 bg-gray-300 group-hover:bg-violet-400 rounded flex items-center justify-center">
          <div className="flex flex-col gap-1">
            <div className="w-1 h-1 bg-gray-500 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 rounded-full" />
            <div className="w-1 h-1 bg-gray-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Right: Editor */}
      <div 
        className="flex-1 flex flex-col min-w-0"
        style={{ width: `${100 - splitRatio}%` }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">新建执行</h1>
            <p className="text-gray-500 text-sm">使用 OpenProse 语法创建工作流</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadExample}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              加载示例
            </button>
            <button
              onClick={clearEditor}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              清空
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 min-h-0 p-4">
          <WorkflowEditor
            value={program}
            onChange={setProgram}
            placeholder="输入 .prose 工作流代码，或让 AI 帮你生成..."
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex-1 mr-4">
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              支持 OpenProse 完整语法：session, agent, parallel, repeat, loop, if/else, try/catch, choice 等
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={loading || !program.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                创建执行
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
