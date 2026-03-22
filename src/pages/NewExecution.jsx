import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { WorkflowEditor } from '../components/WorkflowEditor'
import { AIAssistant } from '../components/AIAssistant'
import { checkApiAvailable, mockApi } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'

const EXAMPLE_PROGRAM = `# AI 研究助手工作流

input topic: "要研究的主题"

agent researcher:
  model: sonnet
  persist: true
  prompt: "You are a research expert"

session: researcher
  context: topic

parallel:
  a = session "收集资料"
  b = session "分析趋势"

choice **severity**:
  option "High":
    session "深度报告"
  option "Low":
    session "简短摘要"

try:
  session "执行研究"
catch as err:
  session "处理错误"
finally:
  session "清理资源"

output findings = session "输出结论"`

export function NewExecution() {
  const [program, setProgram] = useState(EXAMPLE_PROGRAM)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showAI, setShowAI] = useState(true) // 默认显示 AI 助手
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
          // Demo mode - simulate creation
          const mockId = `exec_${Date.now()}`
          navigate(`/console/executions/${mockId}`)
        }
      } else {
        // Use mock API
        const data = await mockApi.createExecution({ program, name: name || '新执行任务' })
        navigate(`/console/executions/${data.execution.id}`)
      }
    } catch (err) {
      // Demo mode fallback
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

  return (
    <div className="flex gap-6 h-[calc(100vh-180px)]">
      {/* Left: AI Assistant Panel */}
      <div className={`${showAI ? 'w-96' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        {showAI && (
          <AIAssistant
            onInsert={handleAIInsert}
            onReplace={handleAIReplace}
            onAppend={handleAIAppend}
            currentCode={program}
          />
        )}
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">新建执行</h1>
            <p className="text-gray-500">使用 OpenProse 语法创建工作流</p>
          </div>
          <button
            onClick={() => setShowAI(!showAI)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
              showAI
                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {showAI ? '隐藏 AI 助手' : 'AI 生成'}
          </button>
        </div>

        {/* Editor Card */}
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-gray-500 text-sm font-medium">workflow.prose</span>
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

          <div className="flex-1 min-h-0">
            <WorkflowEditor
              value={program}
              onChange={setProgram}
              placeholder="输入 .prose 工作流代码，或点击「AI 生成」让 AI 帮你编写..."
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
    </div>
  )
}
