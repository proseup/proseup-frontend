import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { WorkflowEditor } from '../components/WorkflowEditor'
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">新建执行</h1>
        <p className="text-gray-500">使用 OpenProse 语法创建工作流</p>
      </div>

      {/* Editor Card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
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

        <div className="h-[500px]">
          <WorkflowEditor
            value={program}
            onChange={setProgram}
            placeholder="输入 .prose 工作流代码..."
          />
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
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

      {/* Syntax Guide */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">OpenProse 语法说明</h2>
        </div>
        <div className="p-6 text-sm text-gray-600">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-violet-500">session</span> 会话
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-violet-500">session</span> "任务名称"</div>
                <div><span className="text-violet-500">session:</span> agentName</div>
                <div className="text-slate-400">执行一个步骤或Agent</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-purple-500">agent</span> Agent
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-purple-500">agent</span> researcher:</div>
                <div>&nbsp;&nbsp;model: sonnet</div>
                <div>&nbsp;&nbsp;persist: true</div>
                <div className="text-slate-400">定义可复用的Agent</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-yellow-500">parallel</span> 并行
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-yellow-500">parallel:</span></div>
                <div>&nbsp;&nbsp;a = <span className="text-violet-500">session</span> "Task A"</div>
                <div>&nbsp;&nbsp;b = <span className="text-violet-500">session</span> "Task B"</div>
                <div className="text-slate-400">并发执行多个任务</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-orange-500">repeat/for/loop</span> 循环
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-orange-500">repeat</span> 3:</div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "生成"</div>
                <div className="text-slate-400">repeat N次 | for遍历 | loop条件</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-red-500">if/elif/else</span> 条件
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-red-500">if</span> **condition**:</div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "True"</div>
                <div><span className="text-red-500">else:</span></div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "False"</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-gray-500">try/catch</span> 异常
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-gray-500">try:</span></div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "可能失败"</div>
                <div><span className="text-gray-500">catch as</span> err:</div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "处理错误"</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-fuchsia-500">choice</span> AI选择
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-fuchsia-500">choice</span> **severity**:</div>
                <div>&nbsp;&nbsp;<span className="text-fuchsia-500">option</span> "High":</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-violet-500">session</span> "详细"</div>
                <div className="text-slate-400">让AI根据条件选择分支</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-teal-500">block/do</span> 子程序
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-teal-500">block</span> process(item):</div>
                <div>&nbsp;&nbsp;<span className="text-violet-500">session</span> "处理"</div>
                <div><span className="text-teal-500">do</span> process("data")</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-cyan-500">context</span> 上下文
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-cyan-500">context:</span> result</div>
                <div className="text-slate-400">传递变量到下一步</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-green-500">input/output</span> 声明
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-green-500">input</span> topic: "描述"</div>
                <div><span className="text-pink-500">output</span> result = session "输出"</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-slate-300">let/const</span> 变量
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-slate-300">let</span> x = 10</div>
                <div><span className="text-slate-300">const</span> API_KEY = "xxx"</div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="text-emerald-500">use</span> 导入
              </h3>
              <div className="font-mono text-xs bg-gray-50 p-3 rounded space-y-1">
                <div><span className="text-emerald-500">use</span> "alice/research"</div>
                <div className="text-slate-400">导入外部工作流</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
