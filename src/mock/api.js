// Mock data for proseup console when API is unavailable

export const mockUser = {
  id: 1,
  login: "phosaqy",
  avatar_url: "https://avatars.githubusercontent.com/u/1234567?v=4"
}

export const mockExecutions = [
  {
    id: "exec-001",
    status: "completed",
    currentStepIndex: 3,
    createdAt: "2026-03-22T10:00:00Z",
    steps: [
      { id: "step-001", stepIndex: 0, content: "初始化项目", status: "completed", completedAt: "2026-03-22T10:00:30Z" },
      { id: "step-002", stepIndex: 1, content: "安装依赖", status: "completed", completedAt: "2026-03-22T10:01:00Z" },
      { id: "step-003", stepIndex: 2, content: "运行构建", status: "completed", completedAt: "2026-03-22T10:01:30Z" }
    ]
  },
  {
    id: "exec-002",
    status: "running",
    currentStepIndex: 1,
    createdAt: "2026-03-22T11:00:00Z",
    steps: [
      { id: "step-004", stepIndex: 0, content: "准备环境", status: "completed", completedAt: "2026-03-22T11:00:30Z" },
      { id: "step-005", stepIndex: 1, content: "执行测试", status: "running" }
    ]
  },
  {
    id: "exec-003",
    status: "failed",
    currentStepIndex: 1,
    createdAt: "2026-03-22T09:00:00Z",
    steps: [
      { id: "step-006", stepIndex: 0, content: "部署应用", status: "completed", completedAt: "2026-03-22T09:00:30Z" },
      { id: "step-007", stepIndex: 1, content: "健康检查", status: "failed", error: "Connection timeout" }
    ]
  },
  {
    id: "exec-004",
    status: "pending",
    currentStepIndex: 0,
    createdAt: "2026-03-22T12:00:00Z",
    steps: [
      { id: "step-008", stepIndex: 0, content: "等待执行", status: "pending" }
    ]
  }
]

// Convert mockExecutions to format expected by Dashboard/ExecutionList
export const mockExecutionsForList = mockExecutions.map(exec => ({
  id: exec.id,
  name: `执行任务 ${exec.id}`,
  status: exec.status,
  created_at: exec.createdAt,
  steps: exec.steps.length,
  currentStepIndex: exec.currentStepIndex
}))

// API availability check
const API_BASE = 'https://api.proseup.cn'

export const checkApiAvailable = async () => {
  try {
    const res = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    return false
  }
}

// Mock API functions
export const mockApi = {
  // Get current user
  async getUser() {
    await new Promise(resolve => setTimeout(resolve, 300))
    return { user: mockUser }
  },

  // Get all executions
  async getExecutions() {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { executions: mockExecutionsForList }
  },

  // Get single execution
  async getExecution(id) {
    await new Promise(resolve => setTimeout(resolve, 300))
    const exec = mockExecutions.find(e => e.id === id)
    if (!exec) {
      // Return first mock execution as fallback
      return { execution: {
        ...mockExecutions[0],
        id,
        name: `执行任务 ${id}`,
        created_at: mockExecutions[0].createdAt,
        finished_at: mockExecutions[0].status === 'completed' ? '2026-03-22T10:05:00Z' : null,
        steps_count: mockExecutions[0].steps.length,
        steps: mockExecutions[0].steps.map(s => ({
          id: s.id,
          name: s.content,
          status: s.status,
          duration: '1.2s',
          input: '来自上一步',
          output: s.status === 'completed' ? '执行成功' : s.status === 'failed' ? s.error : '执行中...',
          logs: s.status === 'completed'
            ? '[10:00:00] 开始执行\n[10:00:01] 执行中...\n[10:00:02] 完成'
            : '[10:00:00] 开始执行\n[10:00:01] 执行中...',
          started_at: mockExecutions[0].createdAt,
          finished_at: s.completedAt
        }))
      }}
    }
    return {
      execution: {
        ...exec,
        id: exec.id,
        name: `执行任务 ${exec.id}`,
        created_at: exec.createdAt,
        finished_at: exec.status === 'completed' ? '2026-03-22T10:05:00Z' : null,
        steps_count: exec.steps.length,
        steps: exec.steps.map(s => ({
          id: s.id,
          name: s.content,
          status: s.status,
          duration: '1.2s',
          input: '来自上一步',
          output: s.status === 'completed' ? '执行成功' : s.status === 'failed' ? s.error : '执行中...',
          logs: s.status === 'completed'
            ? '[10:00:00] 开始执行\n[10:00:01] 执行中...\n[10:00:02] 完成'
            : '[10:00:00] 开始执行\n[10:00:01] 执行中...',
          started_at: exec.createdAt,
          finished_at: s.completedAt
        }))
      }
    }
  },

  // Create execution
  async createExecution({ program, name }) {
    await new Promise(resolve => setTimeout(resolve, 800))
    return {
      execution: {
        id: `exec-${Date.now()}`,
        status: 'pending',
        currentStepIndex: 0,
        createdAt: new Date().toISOString(),
        steps: [
          { id: `step-${Date.now()}`, stepIndex: 0, content: name || '新执行任务', status: 'pending' }
        ]
      }
    }
  },

  // Complete step (mock)
  async completeStep(executionId, stepId) {
    await new Promise(resolve => setTimeout(resolve, 500))
    return { success: true }
  }
}
