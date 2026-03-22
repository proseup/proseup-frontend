import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { Login } from './pages/Login.jsx'
import { ProtectedRoute } from './components/ProtectedRoute.jsx'
import { ConsoleLayout } from './components/ConsoleLayout.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { ExecutionList } from './pages/ExecutionList.jsx'
import { ExecutionDetail } from './pages/ExecutionDetail.jsx'
import { NewExecution } from './pages/NewExecution.jsx'
import { useAuth } from './context/AuthContext.jsx'

const API_BASE = "https://api.proseup.cn"

const EXAMPLE_PROGRAM = `# .prose 工作流示例
# 定义一个数据处理管道

工作流: 数据处理管道
版本: 1.0

步骤 1: 数据采集
类型: 采集
来源: API
端点: https://api.example.com/data
超时: 30s
动作:
  - 获取原始数据
  - 验证数据格式

步骤 2: 数据清洗
类型: 处理
动作:
  - 过滤无效记录
  - 补全缺失字段
  - 标准化数据格式
  - 去重处理

步骤 3: 数据分析
类型: 分析
模型: gpt-4
提示: 分析数据结构并生成摘要报告
输出: JSON格式

步骤 4: 报告生成
类型: 输出
格式: markdown
模板: analysis-template
动作:
  - 渲染报告模板
  - 插入分析结果
  - 生成可视化图表

步骤 5: 通知与归档
类型: 交付
通知:
  - 邮件: team@example.com
  - 钉钉: webhook-url
归档:
  - COS: proseup-outputs/reports/
  - 保留期: 90天`

const FEATURES = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: "流程即代码",
    description: "用简单的 .prose 语法定义复杂的工作流，纯文本编写，版本控制友好"
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "实时执行",
    description: "每一步都能看到执行状态、中间结果和日志输出，调试从未如此简单"
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    title: "云端运行",
    description: "无需管理服务器，全球分布式执行，自动扩缩容，按需付费"
  }
]

const STATUS_CONFIG = {
  pending: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: '等待中' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: '执行中' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: '已完成' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: '失败' }
}

const STEPS_MOCK = [
  { id: 1, name: '数据采集', status: 'completed', duration: '2.3s', result: '获取 1,247 条记录' },
  { id: 2, name: '数据清洗', status: 'completed', duration: '5.1s', result: '清洗后剩余 1,102 条' },
  { id: 3, name: '数据分析', status: 'running', duration: '-', result: '正在分析中...' },
  { id: 4, name: '报告生成', status: 'pending', duration: '-', result: '-' },
  { id: 5, name: '通知与归档', status: 'pending', duration: '-', result: '-' }
]

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

function Editor({ value, onChange }) {
  const textareaRef = { current: null }
  const lineNumbersRef = { current: null }

  const lines = value.split('\n')

  return (
    <div className="flex bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <div
        ref={lineNumbersRef}
        className="py-4 px-3 text-right text-slate-500 text-sm font-mono select-none bg-slate-900/50 border-r border-slate-800 min-w-[3rem]"
        style={{ overflow: 'hidden' }}
      >
        {lines.map((_, i) => (
          <div key={i} className="leading-6">{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 py-4 px-4 bg-transparent text-slate-100 font-mono text-sm leading-6 resize-none outline-none min-h-[400px]"
        spellCheck={false}
        placeholder="输入 .prose 工作流代码..."
      />
    </div>
  )
}

function StepItem({ step, isActive, onClick }) {
  const config = STATUS_CONFIG[step.status]
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
        isActive
          ? 'bg-violet-50 border-violet-200'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${config.dot}`} />
          <span className="font-medium text-slate-800">{step.name}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      </div>
      {isActive && step.result && (
        <div className="mt-3 pt-3 border-t border-violet-200">
          <div className="text-sm text-slate-600">
            <span className="text-slate-400">耗时:</span> {step.duration}
          </div>
          <div className="text-sm text-slate-600 mt-1">
            <span className="text-slate-400">结果:</span> {step.result}
          </div>
        </div>
      )}
    </div>
  )
}

function LandingPage() {
  const [program, setProgram] = useState(EXAMPLE_PROGRAM)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [execution, setExecution] = useState(null)
  const [activeStep, setActiveStep] = useState(3)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [steps, setSteps] = useState(STEPS_MOCK)
  const { user } = useAuth()

  const createExecution = async () => {
    setLoading(true)
    setError(null)
    setSteps(STEPS_MOCK.map((s, i) => ({ ...s, status: i < 2 ? 'completed' : i === 2 ? 'running' : 'pending' })))
    setActiveStep(2)

    setTimeout(() => {
      setExecution({ id: 'exec_' + Date.now(), status: 'running' })
      setLoading(false)
    }, 1000)
  }

  const simulateProgress = () => {
    const interval = setInterval(() => {
      setSteps(prev => {
        const runningIdx = prev.findIndex(s => s.status === 'running')
        if (runningIdx === -1) {
          clearInterval(interval)
          return prev
        }
        const updated = [...prev]
        updated[runningIdx] = { ...updated[runningIdx], status: 'completed', result: '执行成功', duration: (Math.random() * 3 + 1).toFixed(1) + 's' }
        if (runningIdx + 1 < updated.length) {
          updated[runningIdx + 1] = { ...updated[runningIdx + 1], status: 'running' }
          setActiveStep(runningIdx + 1)
        } else {
          setExecution(prev => prev ? { ...prev, status: 'completed' } : null)
          clearInterval(interval)
        }
        return updated
      })
    }, 1500)
  }

  const handleCreateExecution = async () => {
    await createExecution()
    simulateProgress()
  }

  const refreshExecution = () => {
    setSteps(STEPS_MOCK)
    setExecution(null)
    setActiveStep(null)
  }

  const clearEditor = () => setProgram('')

  const loadExample = () => setProgram(EXAMPLE_PROGRAM)

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
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-slate-300 hover:text-white transition">首页</a>
              <a href="#features" className="text-slate-300 hover:text-white transition">功能</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition">定价</a>
              <a href="#docs" className="text-slate-300 hover:text-white transition">文档</a>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <a
                  href="/console"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 bg-violet-600 text-white font-medium rounded-lg hover:bg-violet-500 transition"
                >
                  <img src={user.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                  控制台
                </a>
              ) : (
                <a
                  href="/login"
                  className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition"
                >
                  登录
                </a>
              )}
              <a
                href="https://github.com/proseup"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-300 hover:text-white transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-slate-800 px-4 py-4">
            <div className="flex flex-col gap-4">
              <a href="#home" className="text-slate-300 hover:text-white">首页</a>
              <a href="#features" className="text-slate-300 hover:text-white">功能</a>
              <a href="#pricing" className="text-slate-300 hover:text-white">定价</a>
              <a href="#docs" className="text-slate-300 hover:text-white">文档</a>
              <a href="https://github.com/proseup" className="text-slate-300 hover:text-white">GitHub</a>
              {user ? (
                <a href="/console" className="text-violet-400 hover:text-violet-300">控制台</a>
              ) : (
                <a href="/login" className="text-slate-300 hover:text-white">登录</a>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            v1.0 发布中
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            让 AI 工作流
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              像写代码一样简单
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            proseup 是一个让 AI 自动化执行复杂任务的工作流平台。
            <br className="hidden sm:block" />
            用简单的语法定义流程，实时监控执行状态，轻松实现复杂自动化。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => document.getElementById('workspace').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:opacity-90 transition shadow-lg shadow-violet-500/25"
            >
              开始使用
            </button>
            <a
              href="#docs"
              className="px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-700"
            >
              查看文档
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">核心特性</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              简洁的设计理念，让复杂的工作流编排变得轻而易举
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="p-8 bg-slate-900 rounded-2xl border border-slate-800 hover:border-violet-500/50 transition-all duration-300 group"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-violet-400 mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workspace Section */}
      <section id="workspace" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">在线工作台</h2>
            <p className="text-slate-400 text-lg">编写 .prose 工作流，即时执行并查看结果</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Editor Panel */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-slate-400 text-sm font-medium">workflow.prose</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadExample}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    示例
                  </button>
                  <button
                    onClick={clearEditor}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
                  >
                    清空
                  </button>
                </div>
              </div>
              <div className="p-4">
                <Editor value={program} onChange={setProgram} />
              </div>
              <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={handleCreateExecution}
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-violet-500/25"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      执行中...
                    </span>
                  ) : (
                    '▶ 执行工作流'
                  )}
                </button>
              </div>
            </div>

            {/* Execution Panel */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800">
                <h3 className="text-white font-semibold">执行状态</h3>
              </div>
              <div className="p-6">
                {execution ? (
                  <div className="space-y-6">
                    {/* Execution Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <div className="text-slate-400 text-xs mb-1">执行 ID</div>
                        <div className="text-white font-mono text-sm truncate">{execution.id}</div>
                      </div>
                      <div className="p-4 bg-slate-800/50 rounded-xl">
                        <div className="text-slate-400 text-xs mb-1">状态</div>
                        <StatusBadge status={execution.status} />
                      </div>
                    </div>

                    {/* Steps Timeline */}
                    <div>
                      <h4 className="text-slate-300 text-sm font-medium mb-4">执行步骤</h4>
                      <div className="space-y-3">
                        {steps.map((step) => (
                          <StepItem
                            key={step.id}
                            step={step}
                            isActive={activeStep === step.id}
                            onClick={() => setActiveStep(step.id)}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-800">
                      <button
                        onClick={refreshExecution}
                        className="flex-1 px-4 py-3 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition text-sm font-medium"
                      >
                        重置
                      </button>
                      <button
                        onClick={handleCreateExecution}
                        disabled={loading || execution.status === 'running'}
                        className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 disabled:opacity-50 transition text-sm font-medium"
                      >
                        重新执行
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium mb-2">等待执行</h4>
                    <p className="text-slate-400 text-sm max-w-xs">
                      在左侧编辑器中编写或加载示例工作流，点击执行按钮开始运行
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-slate-400 text-lg mb-10">
            立即体验 proseup，让 AI 工作流编排变得简单高效
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/login"
              className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition"
            >
              免费试用
            </a>
            <a
              href="#docs"
              className="px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-700"
            >
              联系销售
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">P</span>
              </div>
              <span className="text-slate-400 text-sm">proseup</span>
            </div>
            <div className="text-slate-500 text-sm">
              © 2026 proseup. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-slate-400 hover:text-white text-sm transition">隐私政策</a>
              <a href="#" className="text-slate-400 hover:text-white text-sm transition">使用条款</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 px-6 py-4 bg-red-500/90 text-white rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/console"
        element={
          <ProtectedRoute>
            <ConsoleLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="executions" element={<ExecutionList />} />
        <Route path="executions/:id" element={<ExecutionDetail />} />
        <Route path="new" element={<NewExecution />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App