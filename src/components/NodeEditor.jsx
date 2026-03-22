import { useState, useCallback, useRef, useEffect } from 'react'

const NODE_WIDTH = 240
const NODE_HEADER_HEIGHT = 36
const NODE_MIN_HEIGHT = 60

const TYPE_CONFIG = {
  start: { 
    bg: '#22c55e', label: '开始', icon: '▶', 
    fields: [] 
  },
  end: { 
    bg: '#ef4444', label: '结束', icon: '■', 
    fields: [] 
  },
  input: { 
    bg: '#10b981', label: '输入', icon: '↓', 
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'description', label: '描述', type: 'text' }
    ]
  },
  output: { 
    bg: '#ec4899', label: '输出', icon: '↑', 
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'value', label: '值', type: 'text' }
    ]
  },
  session: { 
    bg: '#3b82f6', label: '步骤', icon: '◎', 
    fields: [
      { key: 'name', label: '任务名称', type: 'text' },
      { key: 'agent', label: 'Agent', type: 'select', options: ['researcher', 'analyst', 'collector'] }
    ]
  },
  agent: { 
    bg: '#8b5cf6', label: 'Agent', icon: '🤖', 
    fields: [
      { key: 'name', label: '名称', type: 'text' },
      { key: 'model', label: '模型', type: 'select', options: ['glm-4-flash', 'glm-4', 'sonnet'] },
      { key: 'prompt', label: '提示词', type: 'textarea' }
    ]
  },
  parallel: { 
    bg: '#eab308', label: '并行', icon: '⫴', 
    fields: [
      { key: 'branches', label: '分支数', type: 'number' }
    ],
    branches: true
  },
  loop: { 
    bg: '#f97316', label: '循环', icon: '↻', 
    fields: [
      { key: 'type', label: '类型', type: 'select', options: ['repeat', 'for', 'while'] },
      { key: 'count', label: '次数', type: 'number' }
    ]
  },
  if: { 
    bg: '#ef4444', label: '条件', icon: '?', 
    fields: [
      { key: 'condition', label: '条件', type: 'text' }
    ],
    hasTrueBranch: true,
    hasFalseBranch: true
  },
  try: { 
    bg: '#6b7280', label: '尝试', icon: '⛨', 
    fields: [],
    hasTryBranch: true,
    hasCatchBranch: true
  },
  choice: { 
    bg: '#8b5cf6', label: '选择', icon: '⋮', 
    fields: [
      { key: 'selector', label: '选择器', type: 'text' }
    ],
    options: ['option1', 'option2']
  }
}

// Generate a simple ID
const genId = () => 'node_' + Math.random().toString(36).substr(2, 9)

function Node({ node, isSelected, onSelect, onUpdate, onDelete }) {
  const config = TYPE_CONFIG[node.type] || TYPE_CONFIG.session
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({ ...node.properties })

  const handleFieldChange = (key, value) => {
    const newData = { ...editData, [key]: value }
    setEditData(newData)
    onUpdate(node.id, newData)
  }

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleClick = (e) => {
    e.stopPropagation()
    onSelect(node.id)
  }

  // Calculate height based on fields
  const fieldHeight = config.fields.length * 44 + (config.branches || config.options ? 60 : 0)
  const totalHeight = Math.max(NODE_MIN_HEIGHT + fieldHeight, NODE_HEADER_HEIGHT + 40)

  return (
    <div
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`absolute rounded-xl shadow-lg cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-900' : 'hover:ring-2 hover:ring-violet-400'
      }`}
      style={{
        left: node.pos[0],
        top: node.pos[1],
        width: NODE_WIDTH,
        minHeight: totalHeight,
        backgroundColor: config.bg,
        zIndex: isSelected ? 10 : 1
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 flex items-center gap-2 text-white font-medium text-sm"
        style={{ height: NODE_HEADER_HEIGHT }}
      >
        <span className="text-base">{config.icon}</span>
        <span className="flex-1 truncate">{editData.name || editData.label || config.label}</span>
        {isSelected && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.id); }}
            className="w-5 h-5 rounded bg-red-500 hover:bg-red-600 flex items-center justify-center text-xs"
          >
            ×
          </button>
        )}
      </div>

      {/* Fields */}
      <div className="bg-white rounded-b-xl p-3 space-y-2">
        {config.fields.map(field => (
          <div key={field.key}>
            <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
            {field.type === 'text' && (
              <input
                type="text"
                value={editData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {field.type === 'textarea' && (
              <textarea
                value={editData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={2}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {field.type === 'select' && (
              <select
                value={editData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white"
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">选择...</option>
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            {field.type === 'number' && (
              <input
                type="number"
                value={editData[field.key] || ''}
                onChange={(e) => handleFieldChange(field.key, parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        ))}

        {/* Branches for parallel */}
        {config.branches && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2">并行分支</div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="分支数"
                value={editData.branches || 2}
                onChange={(e) => handleFieldChange('branches', parseInt(e.target.value) || 2)}
                className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* Options for choice */}
        {config.options && (
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-400 mb-2">选项</div>
            {config.options.map((_, i) => (
              <input
                key={i}
                type="text"
                placeholder={`选项 ${i + 1}`}
                value={editData[`option${i}`] || ''}
                onChange={(e) => handleFieldChange(`option${i}`, e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg mb-1"
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input/Output connectors */}
      <div 
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-300 hover:border-violet-500 cursor-crosshair"
        onClick={(e) => e.stopPropagation()}
      />
      <div 
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-gray-300 hover:border-violet-500 cursor-crosshair"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function NodeEditor({ workflow, onChange }) {
  const { nodes = [], edges = [] } = workflow
  const [selectedNode, setSelectedNode] = useState(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Handle node selection
  const handleSelectNode = useCallback((id) => {
    setSelectedNode(id === selectedNode ? null : id)
  }, [selectedNode])

  // Handle node update
  const handleUpdateNode = useCallback((id, properties) => {
    const newNodes = nodes.map(n => 
      n.id === id ? { ...n, properties: { ...n.properties, ...properties } } : n
    )
    onChange({ nodes: newNodes, edges })
  }, [nodes, edges, onChange])

  // Handle node delete
  const handleDeleteNode = useCallback((id) => {
    const node = nodes.find(n => n.id === id)
    if (node?.type === 'start' || node?.type === 'end') return
    
    const newNodes = nodes.filter(n => n.id !== id)
    const newEdges = edges.filter(e => e.from !== id && e.to !== id)
    setSelectedNode(null)
    onChange({ nodes: newNodes, edges: newEdges })
  }, [nodes, edges, onChange])

  // Add new node
  const handleAddNode = useCallback((type) => {
    const config = TYPE_CONFIG[type]
    const newNode = {
      id: genId(),
      type,
      pos: [100 + Math.random() * 200, 100 + Math.random() * 200],
      properties: { name: config.label }
    }
    onChange({ nodes: [...nodes, newNode], edges })
  }, [nodes, edges, onChange])

  // Pan handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target === containerRef.current || e.target.classList.contains('canvas-bg')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
    }
  }, [offset])

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  // Zoom handlers
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(s => Math.max(0.3, Math.min(2, s * delta)))
    }
  }, [])

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    const sortedNodes = [...nodes].sort((a, b) => a.pos[1] - b.pos[1])
    const newNodes = sortedNodes.map((n, i) => ({
      ...n,
      pos: [100, 60 + i * 180]
    }))
    onChange({ nodes: newNodes, edges })
  }, [nodes, edges, onChange])

  // Clear all
  const handleClear = useCallback(() => {
    const startNode = { id: genId(), type: 'start', pos: [100, 60], properties: { name: '开始' } }
    const endNode = { id: genId(), type: 'end', pos: [100, 240], properties: { name: '结束' } }
    onChange({ nodes: [startNode, endNode], edges: [{ from: startNode.id, to: endNode.id }] })
  }, [onChange])

  // Canvas click to deselect
  const handleCanvasClick = useCallback(() => {
    setSelectedNode(null)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNode) {
          handleDeleteNode(selectedNode)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNode, handleDeleteNode])

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700 flex items-center gap-4">
        <div className="text-sm text-white font-medium">节点类型</div>
        <div className="flex gap-2 flex-wrap">
          {Object.entries(TYPE_CONFIG).filter(([k]) => !['start', 'end'].includes(k)).map(([type, config]) => (
            <button
              key={type}
              onClick={() => handleAddNode(type)}
              className="px-3 py-1.5 text-xs text-white rounded-lg transition hover:opacity-80"
              style={{ backgroundColor: config.bg }}
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={handleAutoLayout}
          className="px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
        >
          📐 自动排列
        </button>
        <button
          onClick={handleClear}
          className="px-3 py-1.5 text-xs text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
        >
          🗑 清空
        </button>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setScale(s => Math.max(0.3, s * 0.8))}
            className="w-7 h-7 text-white bg-slate-700 hover:bg-slate-600 rounded transition"
          >
            -
          </button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(2, s * 1.2))}
            className="w-7 h-7 text-white bg-slate-700 hover:bg-slate-600 rounded transition"
          >
            +
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden canvas-bg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Grid background */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)',
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`
          }}
        />

        {/* Nodes container */}
        <div 
          className="absolute"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0'
          }}
        >
          {nodes.map(node => (
            <Node
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              onSelect={handleSelectNode}
              onUpdate={handleUpdateNode}
              onDelete={handleDeleteNode}
            />
          ))}
        </div>

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-slate-500">
              <div className="text-4xl mb-2">📋</div>
              <div className="text-sm">点击上方按钮添加节点</div>
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
        💡 双击节点编辑属性 | Delete 删除选中节点 | 滚轮缩放 | 拖拽画布移动
      </div>
    </div>
  )
}
