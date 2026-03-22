/**
 * Workflow converter - NodeEditor format
 */

let nodeIdCounter = 1
const genId = () => 'node_' + (nodeIdCounter++)

/**
 * Parse .prose text to workflow nodes
 */
export function parseProseToNodes(prose) {
  const nodes = []
  const lines = prose.split('\n')
  let y = 60
  let prevNodeId = null
  const edges = []

  // Add start node
  const startId = genId()
  nodes.push({
    id: startId,
    type: 'start',
    pos: [100, 60],
    properties: { name: '开始' }
  })
  prevNodeId = startId

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    // Input
    if (trimmed.startsWith('input ')) {
      const match = trimmed.match(/input\s+(\w+):\s*"(.*)"/)
      if (match) {
        const id = genId()
        nodes.push({
          id,
          type: 'input',
          pos: [100, y],
          properties: { name: match[1], description: match[2] }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
    // Agent
    else if (trimmed.startsWith('agent ')) {
      const match = trimmed.match(/agent\s+(\w+):/)
      if (match) {
        const id = genId()
        nodes.push({
          id,
          type: 'agent',
          pos: [100, y],
          properties: { name: match[1], model: 'glm-4-flash', prompt: '' }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
    // Session
    else if (trimmed.startsWith('session')) {
      const match = trimmed.match(/session\s*(?::\s*(\w+))?(?:\s+"(.*)")?/)
      if (match) {
        const id = genId()
        nodes.push({
          id,
          type: 'session',
          pos: [100, y],
          properties: { 
            name: match[2] || (match[1] ? `调用 ${match[1]}` : '执行步骤'),
            agent: match[1] || ''
          }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
    // Parallel
    else if (trimmed === 'parallel:') {
      const id = genId()
      nodes.push({
        id,
        type: 'parallel',
        pos: [100, y],
        properties: { name: '并行执行', branches: 2 }
      })
      edges.push({ from: prevNodeId, to: id })
      prevNodeId = id
      y += 160
    }
    // Repeat/Loop
    else if (trimmed.startsWith('repeat ') || trimmed.startsWith('for ') || trimmed.startsWith('loop ')) {
      const match = trimmed.match(/(repeat|for|loop)\s*(.*)/)
      if (match) {
        const id = genId()
        const type = match[1] === 'repeat' ? 'repeat' : match[1] === 'for' ? 'for' : 'while'
        nodes.push({
          id,
          type: 'loop',
          pos: [100, y],
          properties: { name: `${type} 循环`, type, count: match[2] || '3' }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
    // If
    else if (trimmed.startsWith('if ')) {
      const match = trimmed.match(/if\s+\*\*(\w+)\*\*/)
      if (match) {
        const id = genId()
        nodes.push({
          id,
          type: 'if',
          pos: [100, y],
          properties: { name: '条件判断', condition: match[1] }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
    // Try
    else if (trimmed === 'try:') {
      const id = genId()
      nodes.push({
        id,
        type: 'try',
        pos: [100, y],
        properties: { name: '尝试执行' }
      })
      edges.push({ from: prevNodeId, to: id })
      prevNodeId = id
      y += 160
    }
    // Output
    else if (trimmed.startsWith('output ')) {
      const match = trimmed.match(/output\s+(\w+)\s*=/)
      if (match) {
        const id = genId()
        nodes.push({
          id,
          type: 'output',
          pos: [100, y],
          properties: { name: match[1], value: '' }
        })
        edges.push({ from: prevNodeId, to: id })
        prevNodeId = id
        y += 160
      }
    }
  }

  // Add end node
  const endId = genId()
  nodes.push({
    id: endId,
    type: 'end',
    pos: [100, y],
    properties: { name: '结束' }
  })
  edges.push({ from: prevNodeId, to: endId })

  return { nodes, edges }
}

/**
 * Convert nodes back to prose
 */
export function nodesToProse(nodes, edges) {
  const lines = []
  
  // Sort nodes by Y position
  const sorted = [...nodes].sort((a, b) => a.pos[1] - b.pos[1])
  
  for (const node of sorted) {
    const p = node.properties || {}
    
    switch (node.type) {
      case 'start':
      case 'end':
        break // No prose syntax needed
      case 'input':
        lines.push(`input ${p.name || 'topic'}: "${p.description || ''}"`)
        break
      case 'agent':
        lines.push(`agent ${p.name || 'agent'}:`)
        if (p.model) lines.push(`  model: ${p.model}`)
        if (p.prompt) lines.push(`  prompt: "${p.prompt}"`)
        break
      case 'session':
        if (p.agent) {
          lines.push(`session: ${p.agent}`)
        } else {
          lines.push(`session "${p.name || '步骤'}"`)
        }
        break
      case 'parallel':
        lines.push('parallel:')
        lines.push('  a = session "分支 A"')
        lines.push('  b = session "分支 B"')
        break
      case 'loop':
        if (p.type === 'repeat') {
          lines.push(`repeat ${p.count || 3}:`)
          lines.push('  session "循环任务"')
        } else if (p.type === 'for') {
          lines.push(`for item in items:`)
          lines.push('  session "遍历任务"')
        } else {
          lines.push(`loop until **${p.condition || 'done'}**:`)
          lines.push('  session "循环检查"')
        }
        break
      case 'if':
        lines.push(`if **${p.condition || 'condition'}**:`)
        lines.push('  session "为真"')
        lines.push('else:')
        lines.push('  session "为假"')
        break
      case 'try':
        lines.push('try:')
        lines.push('  session "尝试执行"')
        lines.push('catch as err:')
        lines.push('  session "处理错误"')
        break
      case 'output':
        lines.push(`output ${p.name || 'result'} = session "输出"`)
        break
    }
  }
  
  return lines.join('\n')
}

// Aliases for compatibility
export const proseToComfyUI = parseProseToNodes
export const comfyUIToProse = nodesToProse
export const parseProse = parseProseToNodes
export const autoLayout = () => {}

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
