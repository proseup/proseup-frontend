/**
 * Workflow format converter - Simplified version
 * 每个步骤一个框，直观简洁
 */

/**
 * @typedef {Object} Node
 * @property {string} id
 * @property {string} type - 'step'
 * @property {string} label
 * @property {string} [description]
 * @property {[number, number]} pos
 */

/**
 * @typedef {Object} Edge
 * @property {string} from
 * @property {string} to
 */

const NODE_WIDTH = 280
const NODE_HEIGHT = 60
const X_START = 60
const Y_START = 40
const X_GAP = 40
const Y_GAP = 80

let nodeIdCounter = 1
const genId = () => `node_${nodeIdCounter++}`

/**
 * Parse .prose text to simple steps
 */
export function parseProseToSteps(prose) {
  const steps = []
  const lines = prose.split('\n')
  let currentStep = null
  
  for (const line of lines) {
    const trimmed = line.trim()
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentStep) {
        currentStep.description = currentStep.description?.trim()
        steps.push(currentStep)
        currentStep = null
      }
      continue
    }
    
    // Detect step types
    let type = 'step'
    let label = trimmed
    
    if (trimmed.startsWith('session') || trimmed.startsWith('"')) {
      type = 'step'
      // Extract session name
      const match = trimmed.match(/session\s*(?::\s*(\w+))?(?:\s+"(.*)")?/)
      if (match) {
        label = match[2] || match[1] || trimmed
      } else {
        label = trimmed.replace(/^session\s*/, '').replace(/"/g, '') || '执行'
      }
    } else if (trimmed.startsWith('agent ')) {
      type = 'agent'
      const match = trimmed.match(/agent\s+(\w+)/)
      label = match ? `🤖 ${match[1]}` : trimmed
    } else if (trimmed.startsWith('parallel')) {
      type = 'parallel'
      label = '⚡ 并行执行'
    } else if (trimmed.startsWith('repeat') || trimmed.startsWith('for') || trimmed.startsWith('loop')) {
      type = 'loop'
      label = '🔄 循环执行'
    } else if (trimmed.startsWith('if') || trimmed.startsWith('choice')) {
      type = 'condition'
      label = '❓ 条件判断'
    } else if (trimmed.startsWith('try')) {
      type = 'try'
      label = '🛡️ 尝试执行'
    } else if (trimmed.startsWith('catch')) {
      type = 'catch'
      label = '⚠️ 错误处理'
    } else if (trimmed.startsWith('input ')) {
      type = 'input'
      const match = trimmed.match(/input\s+(\w+):/)
      label = match ? `📥 ${match[1]}` : '📥 输入'
    } else if (trimmed.startsWith('output ')) {
      type = 'output'
      const match = trimmed.match(/output\s+(\w+)/)
      label = match ? `📤 ${match[1]}` : '📤 输出'
    }
    
    // Check if this is a new step (not indented continuation)
    const isNewStep = !line.startsWith('  ') && !line.startsWith('\t')
    
    if (isNewStep && trimmed.endsWith(':')) {
      // Block definition - skip
      continue
    }
    
    if (isNewStep) {
      if (currentStep) {
        currentStep.description = currentStep.description?.trim()
        steps.push(currentStep)
      }
      currentStep = { type, label, description: '' }
    } else if (currentStep) {
      // Continuation line
      currentStep.description += ' ' + trimmed
    }
  }
  
  if (currentStep) {
    currentStep.description = currentStep.description?.trim()
    steps.push(currentStep)
  }
  
  return steps
}

/**
 * Convert prose to simple workflow
 */
export function proseToSimpleWorkflow(prose) {
  nodeIdCounter = 1
  const steps = parseProseToSteps(prose)
  
  const nodes = []
  const edges = []
  
  // Create start node
  const startId = genId()
  nodes.push({
    id: startId,
    type: 'start',
    label: '开始',
    pos: [X_START, Y_START]
  })
  
  // Create step nodes
  let prevId = startId
  steps.forEach((step, index) => {
    const id = genId()
    nodes.push({
      id,
      type: step.type,
      label: step.label,
      description: step.description,
      pos: [X_START, Y_START + (index + 1) * (NODE_HEIGHT + Y_GAP)]
    })
    edges.push({ from: prevId, to: id })
    prevId = id
  })
  
  // Create end node
  const endId = genId()
  nodes.push({
    id: endId,
    type: 'end',
    label: '结束',
    pos: [X_START, Y_START + (steps.length + 1) * (NODE_HEIGHT + Y_GAP)]
  })
  edges.push({ from: prevId, to: endId })
  
  return { nodes, edges }
}

/**
 * Convert simple workflow back to prose text
 */
export function simpleWorkflowToProse(workflow) {
  const { nodes, edges } = workflow
  const lines = []
  
  // Sort nodes by Y position
  const sortedNodes = [...nodes].sort((a, b) => a.pos[1] - b.pos[1])
  
  for (const node of sortedNodes) {
    if (node.type === 'start' || node.type === 'end') {
      continue
    }
    
    if (node.type === 'input') {
      const inputName = node.label.replace('📥 ', '')
      lines.push('input ' + inputName + ': "' + (node.description || '') + '"')
    } else if (node.type === 'output') {
      const outputName = node.label.replace('📤 ', '')
      lines.push('output ' + outputName + ' = session "' + (node.description || '') + '"')
    } else if (node.type === 'agent') {
      const agentName = node.label.replace('🤖 ', '')
      lines.push('agent ' + agentName + ':')
      lines.push('  prompt: "' + (node.description || '') + '"')
    } else if (node.type === 'step') {
      lines.push(`session "${node.label}"`)
    } else if (node.type === 'parallel') {
      lines.push('parallel:')
      lines.push('  session "并行任务 A"')
      lines.push('  session "并行任务 B"')
    } else if (node.type === 'loop') {
      lines.push('repeat 3:')
      lines.push('  session "循环任务"')
    } else if (node.type === 'condition') {
      lines.push('if **condition**:')
      lines.push('  session "条件为真"')
      lines.push('else:')
      lines.push('  session "条件为假"')
    } else if (node.type === 'try') {
      lines.push('try:')
      lines.push('  session "尝试执行"')
      lines.push('catch as err:')
      lines.push('  session "处理错误"')
    }
  }
  
  return lines.join('\n')
}

// Export for compatibility
export const proseToComfyUI = proseToSimpleWorkflow
export const comfyUIToProse = simpleWorkflowToProse
export const parseProse = parseProseToSteps
export const autoLayout = () => {} // No-op for simple workflow

export const NODE_TYPES = {
  start: { bg: '#22c55e', color: 'white', label: '开始' },
  end: { bg: '#ef4444', color: 'white', label: '结束' },
  step: { bg: '#3b82f6', color: 'white', label: '步骤' },
  agent: { bg: '#8b5cf6', color: 'white', label: 'Agent' },
  input: { bg: '#22c55e', color: 'white', label: '输入' },
  output: { bg: '#ec4899', color: 'white', label: '输出' },
  parallel: { bg: '#eab308', color: 'black', label: '并行' },
  loop: { bg: '#f97316', color: 'white', label: '循环' },
  condition: { bg: '#ef4444', color: 'white', label: '条件' },
  try: { bg: '#6b7280', color: 'white', label: '尝试' },
  catch: { bg: '#dc2626', color: 'white', label: '捕获' }
}
