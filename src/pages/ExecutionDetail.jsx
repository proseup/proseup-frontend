import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { StatusBadge } from '../components/StatusBadge'
import { StepTimeline } from '../components/StepTimeline'
import { checkApiAvailable, mockApi } from '../mock/api'

const API_BASE = 'https://api.proseup.cn'

const MOCK_EXECUTION = {
  id: 'exec_001',
  name: '数据处理管道',
  status: 'completed',
  created_at: '2026-03-20T10:30:00Z',
  finished_at: '2026-03-20T10:35:00Z',
  steps_count: 5,
  steps: [
    {
      id: 1,
      name: '数据采集',
      status: 'completed',
      duration: '2.3s',
      input: 'API: https://api.example.com/data',
      output: '获取 1,247 条记录',
      logs: '[10:30:01] 开始采集数据\n[10:30:02] 调用 API 接口\n[10:30:03] 获取响应数据\n[10:30:03] 解析 JSON 格式\n[10:30:03] 共 1,247 条记录',
      started_at: '2026-03-20T10:30:01Z',
      finished_at: '2026-03-20T10:30:04Z'
    },
    {
      id: 2,
      name: '数据清洗',
      status: 'completed',
      duration: '5.1s',
      input: '来自步骤 1 的数据',
      output: '清洗后剩余 1,102 条',
      logs: '[10:30:04] 开始数据清洗\n[10:30:05] 过滤无效记录: 45 条\n[10:30:06] 补全缺失字段: 23 条\n[10:30:07] 标准化数据格式\n[10:30:09] 去重处理: 100 条重复\n[10:30:09] 清洗完成',
      started_at: '2026-03-20T10:30:04Z',
      finished_at: '2026-03-20T10:30:09Z'
    },
    {
      id: 3,
      name: '数据分析',
      status: 'completed',
      duration: '15.2s',
      input: '清洗后的 1,102 条记录',
      output: '生成分析报告摘要',
      logs: '[10:30:09] 开始数据分析\n[10:30:10] 调用 GPT-4 模型\n[10:30:15] 分析中...\n[10:30:24] 生成分析报告\n[10:30:24] 分析完成',
      started_at: '2026-03-20T10:30:09Z',
      finished_at: '2026-03-20T10:30:24Z'
    },
    {
      id: 4,
      name: '报告生成',
      status: 'completed',
      duration: '3.5s',
      input: '分析报告摘要',
      output: '生成 Markdown 报告',
      logs: '[10:30:24] 开始生成报告\n[10:30:25] 渲染报告模板\n[10:30:26] 插入分析结果\n[10:30:27] 生成可视化图表\n[10:30:27] 导出 Markdown\n[10:30:27] 报告生成完成',
      started_at: '2026-03-20T10:30:24Z',
      finished_at: '2026-03-20T10:30:27Z'
    },
    {
      id: 5,
      name: '通知与归档',
      status: 'completed',
      duration: '1.2s',
      input: '报告文件路径',
      output: '已发送邮件通知，已归档到 COS',
      logs: '[10:30:27] 开始通知与归档\n[10:30:28] 发送邮件通知\n[10:30:28] 上传文件到 COS\n[10:30:28] 归档完成\n[10:30:28] 全部完成',
      started_at: '2026-03-20T10:30:27Z',
      finished_at: '2026-03-20T10:30:28Z'
    }
  ]
}

export function ExecutionDetail() {
  const { id } = useParams()
  const [execution, setExecution] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isMockMode, setIsMockMode] = useState(false)

  useEffect(() => {
    fetchExecution()
  }, [id])

  const fetchExecution = async () => {
    try {
      const apiAvailable = await checkApiAvailable()
      if (apiAvailable) {
        const res = await fetch(`${API_BASE}/api/executions/${id}`, {
          credentials: 'include'
        })
        if (res.ok) {
          const data = await res.json()
          setExecution(data.execution)
        } else if (res.status === 404) {
          setExecution({ ...MOCK_EXECUTION, id })
        } else {
          setError('加载失败')
        }
        setIsMockMode(false)
      } else {
        // Use mock data for demo
        const data = await mockApi.getExecution(id)
        setExecution(data.execution)
        setIsMockMode(true)
      }
    } catch (err) {
      // Use mock data for demo
      const data = await mockApi.getExecution(id)
      setExecution(data.execution)
      setIsMockMode(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !execution) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-gray-900 font-medium mb-2">{error || '执行不存在'}</h3>
        <Link to="/console/executions" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
          返回列表
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link to="/console/executions" className="hover:text-gray-700">执行列表</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{execution.id}</span>
          {isMockMode && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium">(Mock)</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{execution.name}</h1>
            <p className="text-gray-500">执行 ID: {execution.id}</p>
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
      </div>

      {/* Execution Info Card */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">执行信息</h2>
        </div>
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">状态</div>
            <StatusBadge status={execution.status} />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">创建时间</div>
            <div className="text-gray-900">
              {new Date(execution.created_at).toLocaleString('zh-CN')}
            </div>
          </div>
          {execution.finished_at && (
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">完成时间</div>
              <div className="text-gray-900">
                {new Date(execution.finished_at).toLocaleString('zh-CN')}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">步骤数</div>
            <div className="text-gray-900">{execution.steps_count}</div>
          </div>
        </div>
      </div>

      {/* Step Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">执行步骤</h2>
        </div>
        <div className="p-6">
          <StepTimeline steps={execution.steps} />
        </div>
      </div>
    </div>
  )
}