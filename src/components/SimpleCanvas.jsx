import { useState, useCallback, useRef, useEffect } from 'react'

const NODE_WIDTH = 280
const NODE_HEIGHT = 60
const X_START = 60
const Y_START = 40
const Y_GAP = 80

const TYPE_COLORS = {
  start: { bg: '#22c55e', color: 'white' },
  end: { bg: '#ef4444', color: 'white' },
  step: { bg: '#3b82f6', color: 'white' },
  agent: { bg: '#8b5cf6', color: 'white' },
  input: { bg: '#22c55e', color: 'white' },
  output: { bg: '#ec4899', color: 'white' },
  parallel: { bg: '#eab308', color: 'black' },
  loop: { bg: '#f97316', color: 'white' },
  condition: { bg: '#ef4444', color: 'white' },
  try: { bg: '#6b7280', color: 'white' },
  catch: { bg: '#dc2626', color: 'white' }
}

function Node({ node, isSelected, onClick, onDoubleClick }) {
  const config = TYPE_COLORS[node.type] || TYPE_COLORS.step
  
  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`absolute rounded-xl shadow-lg cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-violet-400 ring-offset-2 ring-offset-slate-900' : ''
      }`}
      style={{
        left: node.pos[0],
        top: node.pos[1],
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        backgroundColor: config.bg,
        color: config.color
      }}
    >
      <div className="flex items-center justify-center h-full px-4">
        <div className="text-center">
          <div className="font-medium text-sm truncate">{node.label}</div>
          {node.description && (
            <div className="text-xs opacity-75 truncate mt-0.5">{node.description}</div>
          )}
        </div>
      </div>
      
      {/* Input connector */}
      <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-400" />
      
      {/* Output connector */}
      <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-slate-400" />
    </div>
  )
}

function Edge({ from, to, nodes }) {
  const fromNode = nodes.find(n => n.id === from)
  const toNode = nodes.find(n => n.id === to)
  
  if (!fromNode || !toNode) return null
  
  const x1 = fromNode.pos[0] + NODE_WIDTH
  const y1 = fromNode.pos[1] + NODE_HEIGHT / 2
  const x2 = toNode.pos[0]
  const y2 = toNode.pos[1] + NODE_HEIGHT / 2
  
  // Calculate control points for smooth curve
  const midX = (x1 + x2) / 2
  
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      <path
        d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
        fill="none"
        stroke="#64748b"
        strokeWidth={2}
        strokeLinecap="round"
      />
      {/* Arrow */}
      <polygon
        points={`${x2},${y2} ${x2-8},${y2-4} ${x2-8},${y2+4}`}
        fill="#64748b"
      />
    </svg>
  )
}

export function SimpleCanvas({ workflow, onChange }) {
  const { nodes = [], edges = [] } = workflow
  const [selectedNode, setSelectedNode] = useState(null)
  const [editingNode, setEditingNode] = useState(null)
  const [editText, setEditText] = useState('')
  const containerRef = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  
  // Calculate canvas size
  const maxY = nodes.length > 0 
    ? Math.max(...nodes.map(n => n.pos[1])) + NODE_HEIGHT + 100
    : 500
  
  // Handle node selection
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node.id === selectedNode ? null : node.id)
  }, [selectedNode])
  
  // Handle node edit
  const handleNodeDoubleClick = useCallback((node) => {
    setEditingNode(node.id)
    setEditText(node.label)
  }, [])
  
  // Save node edit
  const handleSaveEdit = useCallback(() => {
    if (editingNode) {
      const newNodes = nodes.map(n => 
        n.id === editingNode 
          ? { ...n, label: editText }
          : n
      )
      onChange({ nodes: newNodes, edges })
      setEditingNode(null)
      setEditText('')
    }
  }, [editingNode, editText, nodes, edges, onChange])
  
  // Delete selected node
  const handleDelete = useCallback(() => {
    if (selectedNode) {
      // Don't allow deleting start/end nodes
      const node = nodes.find(n => n.id === selectedNode)
      if (node?.type === 'start' || node?.type === 'end') {
        return
      }
      const newNodes = nodes.filter(n => n.id !== selectedNode)
      const newEdges = edges.filter(e => e.from !== selectedNode && e.to !== selectedNode)
      // Reconnect edges
      if (newNodes.length > 1) {
        const sortedNodes = [...newNodes].sort((a, b) => a.pos[1] - b.pos[1])
        const reconnectEdges = []
        for (let i = 0; i < sortedNodes.length - 1; i++) {
          reconnectEdges.push({ from: sortedNodes[i].id, to: sortedNodes[i + 1].id })
        }
        onChange({ nodes: newNodes, edges: reconnectEdges })
      } else {
        onChange({ nodes: newNodes, edges: [] })
      }
      setSelectedNode(null)
    }
  }, [selectedNode, nodes, edges, onChange])
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingNode) {
        if (e.key === 'Enter') {
          handleSaveEdit()
        } else if (e.key === 'Escape') {
          setEditingNode(null)
          setEditText('')
        }
        return
      }
      
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        handleDelete()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingNode, selectedNode, handleDelete, handleSaveEdit])
  
  // Zoom with mouse wheel
  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setScale(s => Math.max(0.5, Math.min(2, s * delta)))
    }
  }, [])
  
  return (
    <div className="h-full bg-slate-900 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-800/95 border border-slate-700 rounded-xl p-1.5 z-10">
        <span className="text-xs text-slate-400 px-2">画布模式</span>
        <div className="w-px h-5 bg-slate-600" />
        <button
          onClick={() => setScale(s => Math.min(2, s * 1.2))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          title="放大"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <span className="text-xs text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={() => setScale(s => Math.max(0.5, s * 0.8))}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          title="缩小"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={() => setScale(1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
          title="重置"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* Node count */}
      <div className="absolute top-3 right-3 text-xs text-slate-500 bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-1.5">
        {nodes.length} 个节点
      </div>
      
      {/* Help text */}
      {nodes.length <= 2 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-500">
            <div className="text-lg mb-2">📋 工作流可视化</div>
            <div className="text-sm">在左侧编辑 .prose 代码，右侧会自动生成可视化流程图</div>
          </div>
        </div>
      )}
      
      {/* Canvas */}
      <div 
        ref={containerRef}
        className="h-full overflow-auto"
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <div 
          className="relative"
          style={{ 
            width: '100%', 
            minHeight: maxY,
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        >
          {/* Edges */}
          <div className="absolute inset-0 pointer-events-none">
            {edges.map((edge, i) => (
              <Edge key={i} {...edge} nodes={nodes} />
            ))}
          </div>
          
          {/* Nodes */}
          {nodes.map(node => (
            <Node
              key={node.id}
              node={node}
              isSelected={selectedNode === node.id}
              onClick={() => handleNodeClick(node)}
              onDoubleClick={() => handleNodeDoubleClick(node)}
            />
          ))}
        </div>
      </div>
      
      {/* Edit Modal */}
      {editingNode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-80 border border-slate-700">
            <h3 className="text-white font-medium mb-4">编辑节点</h3>
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              autoFocus
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setEditingNode(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
