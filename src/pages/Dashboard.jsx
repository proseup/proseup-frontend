import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { mockExecutionsForList, checkApiAvailable } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'

export function Dashboard() {
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMockMode, setIsMockMode] = useState(false)

  useEffect(() => {
    fetchExecutions()
  }, [])

  const fetchExecutions = async () => {
    try {
      const apiAvailable = await checkApiAvailable()
      if (apiAvailable) {
        const res = await fetch(`${API_BASE}/api/executions`, {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setExecutions(data.executions || [])
        } else {
          setExecutions(mockExecutionsForList)
          setIsMockMode(true)
        }
      } else {
        setExecutions(mockExecutionsForList)
        setIsMockMode(true)
      }
    } catch (err) {
      setExecutions(mockExecutionsForList)
      setIsMockMode(true)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'completed').length,
    running: executions.filter(e => e.status === 'running').length,
    failed: executions.filter(e => e.status === 'failed').length
  }

  const recentExecutions = executions.slice(0, 5)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">仪表盘</h1>
          {isMockMode && (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">(Mock)</span>
          )}
        </div>
        <p className="text-gray-500">欢迎回来！以下是您的执行概览</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">执行总数</div>
          <div className="text-3xl font-bold text-gray-900">{loading ? '-' : stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">成功</div>
          <div className="text-3xl font-bold text-green-600">{loading ? '-' : stats.completed}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">进行中</div>
          <div className="text-3xl font-bold text-blue-600">{loading ? '-' : stats.running}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm font-medium text-gray-500 mb-1">失败</div>
          <div className="text-3xl font-bold text-red-600">{loading ? '-' : stats.failed}</div>
        </div>
      </div>

      {/* Recent Executions */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">最近执行</h2>
          <Link
            to="/console/executions"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            查看全部
          </Link>
        </div>

        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        ) : recentExecutions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-medium mb-2">暂无执行记录</h3>
            <p className="text-gray-500 text-sm mb-6">创建您的第一个执行任务开始使用</p>
            <Link
              to="/console/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建执行
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentExecutions.map((execution) => (
              <Link
                key={execution.id}
                to={`/console/executions/${execution.id}`}
                className="block px-5 py-4 hover:bg-gray-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{execution.name}</div>
                      <div className="text-sm text-gray-500">
                        {execution.id} · {new Date(execution.created_at).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={execution.status} />
                    <span className="text-sm text-gray-500">{execution.steps} 步骤</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}