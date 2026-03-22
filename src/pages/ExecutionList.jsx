import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { mockExecutionsForList, checkApiAvailable } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'running', label: '进行中' },
  { key: 'completed', label: '已完成' },
  { key: 'failed', label: '失败' }
]

const PAGE_SIZE = 5

export function ExecutionList() {
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
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

  const filteredExecutions = activeTab === 'all'
    ? executions
    : executions.filter(e => e.status === activeTab)

  const totalPages = Math.ceil(filteredExecutions.length / PAGE_SIZE)
  const paginatedExecutions = filteredExecutions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tabCounts = {
    all: executions.length,
    running: executions.filter(e => e.status === 'running').length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">执行列表</h1>
            {isMockMode && (
              <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">(Mock)</span>
            )}
          </div>
          <p className="text-gray-500">查看和管理所有工作流执行</p>
        </div>
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

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="px-4 py-3 flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                activeTab === tab.key ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        ) : paginatedExecutions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-gray-900 font-medium mb-2">暂无执行记录</h3>
            <p className="text-gray-500 text-sm mb-6">
              {activeTab === 'all' ? '创建您的第一个执行任务开始使用' : '当前筛选条件下没有执行记录'}
            </p>
            {activeTab === 'all' && (
              <Link
                to="/console/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
              >
                新建执行
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">执行ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">步骤数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedExecutions.map((execution) => (
                  <tr key={execution.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/console/executions/${execution.id}`}
                        className="font-mono text-sm text-gray-900 hover:text-indigo-600"
                      >
                        {execution.id.length > 16 ? execution.id.slice(0, 16) + '...' : execution.id}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={execution.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(execution.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {execution.steps}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/console/executions/${execution.id}`}
                        className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        查看详情
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  第 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filteredExecutions.length)} 条，共 {filteredExecutions.length} 条
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}