import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

const API_BASE = 'https://api.proseup.cn'

const STATUS_CONFIG = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: '等待中' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: '执行中' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: '已完成' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: '失败' }
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export function Console() {
  const { user, logout } = useAuth()
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/executions`, {
        credentials: 'include'
      })
      if (res.ok) {
        const data = await res.json()
        setExecutions(data.executions || [])
      } else {
        // Demo mode - use mock data
        setExecutions([
          { id: 'exec_001', name: '数据处理管道', status: 'completed', created_at: '2026-03-20T10:30:00Z', steps: 5 },
          { id: 'exec_002', name: '报告生成流程', status: 'running', created_at: '2026-03-21T14:20:00Z', steps: 3 },
          { id: 'exec_003', name: '内容分析任务', status: 'failed', created_at: '2026-03-22T09:15:00Z', steps: 2 }
        ])
      }
    } catch (err) {
      // Demo mode fallback
      setExecutions([
        { id: 'exec_001', name: '数据处理管道', status: 'completed', created_at: '2026-03-20T10:30:00Z', steps: 5 },
        { id: 'exec_002', name: '报告生成流程', status: 'running', created_at: '2026-03-21T14:20:00Z', steps: 3 },
        { id: 'exec_003', name: '内容分析任务', status: 'failed', created_at: '2026-03-22T09:15:00Z', steps: 2 }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExecution = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/executions`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '新执行任务' })
      })
      if (res.ok) {
        const data = await res.json()
        setExecutions(prev => [data.execution, ...prev])
      }
    } catch (err) {
      // Demo mode
      const newExec = {
        id: `exec_${Date.now()}`,
        name: '新执行任务',
        status: 'pending',
        created_at: new Date().toISOString(),
        steps: 0
      }
      setExecutions(prev => [newExec, ...prev])
    }
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-white font-semibold text-lg">proseup</span>
              <span className="ml-2 px-2 py-0.5 text-xs bg-violet-500/20 text-violet-300 rounded">控制台</span>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3">
                  {user.avatar_url && (
                    <img
                      src={user.avatar_url}
                      alt={user.login}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="hidden sm:block">
                    <div className="text-sm text-white font-medium">{user.name || user.login}</div>
                    <div className="text-xs text-slate-400">@{user.login}</div>
                  </div>
                </div>
              )}
              <button
                onClick={logout}
                className="px-4 py-2 text-slate-300 hover:text-white text-sm font-medium transition"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">我的执行</h1>
              <p className="text-slate-400">管理和监控您的工作流执行</p>
            </div>
            <button
              onClick={handleCreateExecution}
              className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:opacity-90 transition shadow-lg shadow-violet-500/25"
            >
              新建执行
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-sm mb-1">总执行数</div>
              <div className="text-2xl font-bold text-white">{executions.length}</div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-sm mb-1">完成</div>
              <div className="text-2xl font-bold text-green-400">
                {executions.filter(e => e.status === 'completed').length}
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-sm mb-1">执行中</div>
              <div className="text-2xl font-bold text-blue-400">
                {executions.filter(e => e.status === 'running').length}
              </div>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-sm mb-1">失败</div>
              <div className="text-2xl font-bold text-red-400">
                {executions.filter(e => e.status === 'failed').length}
              </div>
            </div>
          </div>

          {/* Executions List */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">执行历史</h2>
            </div>

            {loading ? (
              <div className="p-12 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : executions.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-white font-medium mb-2">暂无执行记录</h3>
                <p className="text-slate-400 text-sm mb-6">创建您的第一个执行任务开始使用</p>
                <button
                  onClick={handleCreateExecution}
                  className="px-6 py-3 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-500 transition"
                >
                  新建执行
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="px-6 py-4 hover:bg-slate-800/50 transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-white font-medium">{execution.name}</div>
                          <div className="text-slate-400 text-sm">
                            {execution.id} · {new Date(execution.created_at).toLocaleDateString('zh-CN')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <StatusBadge status={execution.status} />
                        <span className="text-slate-400 text-sm">{execution.steps} 步骤</span>
                        <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
