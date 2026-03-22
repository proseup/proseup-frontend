import { useState, useRef, useCallback, useEffect } from 'react';
import { NODE_TYPES } from '../utils/workflowConverter';

/**
 * @typedef {Object} CanvasNode
 * @property {string} id
 * @property {string} type
 * @property {[number, number]} pos
 * @property {{ width?: number, height?: number }} size
 * @property {Record<string, any>} properties
 */

/**
 * @typedef {Object} CanvasEdge
 * @property {string} from
 * @property {number} from_slot
 * @property {string} to
 * @property {number} to_slot
 */

/**
 * @typedef {Object} CanvasWorkflow
 * @property {CanvasNode[]} nodes
 * @property {CanvasEdge[]} edges
 */

const NODE_WIDTH = 220;
const NODE_HEIGHT = 90;
const SLOT_RADIUS = 6;

let nodeIdCounter = 100;
const genNodeId = () => `node_${nodeIdCounter++}`;

const NODE_PALETTE = [
  { type: 'Start', label: '开始', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' },
  { type: 'Session', label: '会话', icon: 'M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { type: 'Agent', label: 'Agent', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { type: 'Parallel', label: '并行', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { type: 'Loop', label: '循环', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
  { type: 'Conditional', label: '条件', icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4' },
  { type: 'TryCatch', label: '异常处理', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  { type: 'Choice', label: '选择', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { type: 'Block', label: '子程序', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z' },
  { type: 'Variable', label: '变量', icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14' },
  { type: 'Input', label: '输入', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14' },
  { type: 'Output', label: '输出', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { type: 'End', label: '结束', icon: 'M5 10l7-7m0 0l7 7m-7-7v18' }
];

function getNodeColors(type) {
  const config = NODE_TYPES[type] || { bg: '#3b82f6', border: '#2563eb', color: '#60a5fa' };
  return config;
}

function Node({ node, isSelected, onSelect, onDoubleClick, onContextMenu, onDragStart }) {
  const colors = getNodeColors(node.type);
  const [width, height] = node.size || [NODE_WIDTH, NODE_HEIGHT];
  const name = node.properties?.name || node.type;
  const config = NODE_TYPES[node.type] || { slots: { in: 1, out: 1 } };

  return (
    <g
      transform={`translate(${node.pos[0]}, ${node.pos[1]})`}
      onClick={(e) => { e.stopPropagation(); onSelect(node.id); }}
      onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(node); }}
      onContextMenu={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
      onMouseDown={(e) => {
        if (e.button === 0) {
          e.stopPropagation();
          onDragStart(e, node.id);
        }
      }}
      style={{ cursor: 'grab' }}
    >
      {/* Shadow */}
      <rect
        x={3} y={3} width={width} height={height} rx={10}
        fill="rgba(0,0,0,0.35)"
      />
      {/* Main body */}
      <rect
        x={0} y={0} width={width} height={height} rx={10}
        fill="#1e293b"
        stroke={isSelected ? '#8b5cf6' : colors.border}
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="transition-all duration-150"
      />
      {/* Type header */}
      <rect
        x={0} y={0} width={width} height={28} rx={10}
        fill={colors.bg}
        className="opacity-95"
      />
      <rect x={0} y={14} width={width} height={14} fill={colors.bg} />

      {/* Type icon */}
      <text x={12} y={19} fill="white" fontSize={11} fontWeight="700" fontFamily="monospace">
        {node.type.toUpperCase()}
      </text>

      {/* Status dot */}
      <circle cx={width - 16} cy={14} r={4} fill={colors.color} opacity={0.8} />

      {/* Node name */}
      <text
        x={width / 2} y={50}
        fill="#f1f5f9"
        fontSize={13}
        fontWeight="600"
        textAnchor="middle"
        fontFamily="sans-serif"
      >
        {name.length > 22 ? name.substring(0, 20) + '…' : name}
      </text>

      {/* Properties preview */}
      {node.properties?.agent && (
        <text x={width / 2} y={67} fill="#94a3b8" fontSize={9} textAnchor="middle" fontFamily="monospace">
          → {node.properties.agent}
        </text>
      )}
      {node.properties?.prompt && (
        <text x={width / 2} y={67} fill="#64748b" fontSize={8} textAnchor="middle" fontFamily="sans-serif">
          "{node.properties.prompt.substring(0, 28)}…"
        </text>
      )}

      {/* Input slot */}
      {config.slots.in > 0 && (
        <circle
          cx={0} cy={height / 2} r={SLOT_RADIUS}
          fill="#0f172a"
          stroke={colors.border}
          strokeWidth={2}
          className="cursor-crosshair hover:fill-violet-500 transition-colors"
        />
      )}

      {/* Output slot */}
      {config.slots.out > 0 && (
        <circle
          cx={width} cy={height / 2} r={SLOT_RADIUS}
          fill="#0f172a"
          stroke={colors.border}
          strokeWidth={2}
          className="cursor-crosshair hover:fill-violet-500 transition-colors"
        />
      )}

      {/* Multiple output slots for Parallel/Conditional */}
      {config.slots.out > 1 && (
        <>
          <circle cx={width} cy={height / 3} r={SLOT_RADIUS - 1}
            fill="#0f172a" stroke={colors.border} strokeWidth={1.5}
            className="cursor-crosshair hover:fill-violet-500"
          />
          <circle cx={width} cy={(height * 2) / 3} r={SLOT_RADIUS - 1}
            fill="#0f172a" stroke={colors.border} strokeWidth={1.5}
            className="cursor-crosshair hover:fill-violet-500"
          />
        </>
      )}
    </g>
  );
}

function Edge({ edge, nodes }) {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return null;

  const [fx, fy] = fromNode.pos;
  const [tx, ty] = toNode.pos;
  const [fw, fh] = fromNode.size || [NODE_WIDTH, NODE_HEIGHT];
  const [tw, th] = toNode.size || [NODE_WIDTH, NODE_HEIGHT];

  const startX = fx + fw;
  const startY = fy + fh / 2;
  const endX = tx;
  const endY = ty + th / 2;

  const cpOffset = Math.min(Math.abs(tx - fx) / 2, 100);
  const pathD = `M ${startX} ${startY} C ${startX + cpOffset} ${startY}, ${endX - cpOffset} ${endY}, ${endX} ${endY}`;

  return (
    <g>
      <path d={pathD} fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth={4} strokeLinecap="round" transform="translate(1,1)" />
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" className="transition-all duration-150" />
      <circle cx={endX} cy={endY} r={5} fill="#6366f1" />
      <circle cx={endX} cy={endY} r={2.5} fill="#a5b4fc" />
    </g>
  );
}

function MiniMap({ nodes, scale, offset, canvasSize }) {
  const MAP_W = 160;
  const MAP_H = 110;
  const MAP_SCALE = 0.04;

  if (nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodes.forEach(node => {
    const [x, y] = node.pos;
    const [w, h] = node.size || [NODE_WIDTH, NODE_HEIGHT];
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
  });

  const pad = 30;
  const contentW = maxX - minX + pad * 2;
  const contentH = maxY - minY + pad * 2;
  const mapScale = Math.min(MAP_W / contentW, MAP_H / contentH, MAP_SCALE);

  const tx = (x) => (x - minX + pad) * mapScale;
  const ty = (y) => (y - minY + pad) * mapScale;

  const vpX = (-offset.x / scale - minX + pad) * mapScale;
  const vpY = (-offset.y / scale - minY + pad) * mapScale;
  const vpW = (canvasSize.width / scale) * mapScale;
  const vpH = (canvasSize.height / scale) * mapScale;

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const worldX = clickX / mapScale + minX - pad;
    const worldY = clickY / mapScale + minY - pad;
    return { worldX, worldY };
  };

  return (
    <div className="absolute bottom-4 right-4 bg-slate-800/95 border border-slate-600 rounded-xl overflow-hidden shadow-xl">
      <svg
        width={MAP_W} height={MAP_H}
        className="cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          const worldX = clickX / mapScale + minX - pad;
          const worldY = clickY / mapScale + minY - pad;
          window.__canvasNavigate?.(worldX - canvasSize.width / scale / 2, worldY - canvasSize.height / scale / 2);
        }}
      >
        {nodes.map(node => {
          const [x, y] = node.pos;
          const [w, h] = node.size || [NODE_WIDTH, NODE_HEIGHT];
          const colors = getNodeColors(node.type);
          return (
            <rect key={node.id} x={tx(x)} y={ty(y)} width={w * mapScale} height={h * mapScale}
              fill={colors.bg} rx={2} opacity={0.85}
            />
          );
        })}
        <rect x={vpX} y={vpY} width={Math.max(vpW, 8)} height={Math.max(vpH, 6)}
          fill="rgba(139,92,246,0.15)" stroke="#8b5cf6" strokeWidth={1.5} rx={3}
        />
      </svg>
    </div>
  );
}

function NodeEditModal({ node, onSave, onClose, allNodes }) {
  const [form, setForm] = useState({ ...node.properties, _name: node.properties?.name || '', _type: node.type });

  useEffect(() => {
    setForm({ ...node.properties, _name: node.properties?.name || '', _type: node.type });
  }, [node]);

  if (!node) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...node,
      type: form._type || node.type,
      properties: {
        ...node.properties,
        name: form._name,
        ...Object.fromEntries(Object.entries(form).filter(([k]) => k.startsWith('_') === false))
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-2xl border border-slate-600 w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getNodeColors(form._type || node.type).bg }} />
            编辑节点
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">类型</label>
              <select
                value={form._type || node.type}
                onChange={(e) => setForm({ ...form, _type: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
              >
                {Object.keys(NODE_TYPES).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">名称</label>
              <input
                type="text"
                value={form._name || ''}
                onChange={(e) => setForm({ ...form, _name: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="节点名称"
              />
            </div>
          </div>

          {/* Type-specific fields */}
          {(form._type === 'Session' || form._type === 'Agent') && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Agent</label>
                <input
                  type="text"
                  value={form.agent || ''}
                  onChange={(e) => setForm({ ...form, agent: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                  placeholder="agent name"
                />
              </div>
              {form._type === 'Agent' && (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">Model</label>
                    <select
                      value={form.model || 'sonnet'}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                    >
                      <option value="sonnet">Sonnet</option>
                      <option value="opus">Opus</option>
                      <option value="haiku">Haiku</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="persist"
                      checked={form.persist || false}
                      onChange={(e) => setForm({ ...form, persist: e.target.checked })}
                      className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-violet-500"
                    />
                    <label htmlFor="persist" className="text-sm text-slate-300">持久化 Agent</label>
                  </div>
                </>
              )}
            </>
          )}

          {form._type === 'Loop' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">循环类型</label>
                  <select
                    value={form.loopType || 'repeat'}
                    onChange={(e) => setForm({ ...form, loopType: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="repeat">repeat N</option>
                    <option value="for">for item in array</option>
                    <option value="loop">loop until condition</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">次数/Max</label>
                  <input
                    type="number"
                    value={form.count || form.max || ''}
                    onChange={(e) => setForm({ ...form, count: e.target.value, max: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                    placeholder="次数"
                  />
                </div>
              </div>
            </>
          )}

          {form._type === 'Conditional' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">条件</label>
              <input
                type="text"
                value={form.condition || ''}
                onChange={(e) => setForm({ ...form, condition: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="**condition**"
              />
            </div>
          )}

          {form._type === 'TryCatch' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">错误变量名</label>
              <input
                type="text"
                value={form.errorVar || 'err'}
                onChange={(e) => setForm({ ...form, errorVar: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="err"
              />
            </div>
          )}

          {form._type === 'Variable' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">变量值</label>
              <input
                type="text"
                value={form.value || ''}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="session 'Task'"
              />
            </div>
          )}

          {form._type === 'Input' && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wide">描述</label>
              <input
                type="text"
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-violet-500"
                placeholder="输入描述"
              />
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm font-medium">
              取消
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-500 hover:to-purple-500 transition text-sm font-medium shadow-lg shadow-violet-500/25">
              保存更改
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContextMenu({ x, y, onClose, onEdit, onDelete, onDuplicate }) {
  useEffect(() => {
    const handleClick = () => onClose();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [onClose]);

  return (
    <div className="fixed bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-1.5 z-50 min-w-[160px]"
      style={{ left: x, top: y }} onClick={(e) => e.stopPropagation()}>
      <button className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition"
        onClick={onEdit}>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        编辑节点
      </button>
      <button className="w-full px-4 py-2.5 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition"
        onClick={onDuplicate}>
        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        复制节点
      </button>
      <div className="my-1 border-t border-slate-700" />
      <button className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-slate-700 flex items-center gap-3 transition"
        onClick={onDelete}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        删除节点
      </button>
    </div>
  );
}

export function CanvasEditor({ workflow, onChange }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 50, y: 50 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 900, height: 600 });
  const [contextMenu, setContextMenu] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [draggingNew, setDraggingNew] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const { nodes = [], edges = [] } = workflow;

  // Expose navigate function for minimap
  useEffect(() => {
    window.__canvasNavigate = (x, y) => {
      setOffset({ x: -x * scale, y: -y * scale });
    };
    return () => { delete window.__canvasNavigate; };
  }, [scale]);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const newScale = Math.min(scale * 1.2, 2.5);
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const worldX = (centerX - offset.x) / scale;
          const worldY = (centerY - offset.y) / scale;
          setScale(newScale);
          setOffset({ x: centerX - worldX * newScale, y: centerY - worldY * newScale });
        }
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const newScale = Math.max(scale * 0.8, 0.2);
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const worldX = (centerX - offset.x) / scale;
          const worldY = (centerY - offset.y) / scale;
          setScale(newScale);
          setOffset({ x: centerX - worldX * newScale, y: centerY - worldY * newScale });
        }
      } else if (e.key === '0') {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale, offset]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setCanvasSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.2), 2.5);
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;
    const newOffsetX = mouseX - worldX * newScale;
    const newOffsetY = mouseY - worldY * newScale;
    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  const handleMouseDown = useCallback((e) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    } else if (e.button === 0 && e.target === e.currentTarget) {
      setSelectedNodeId(null);
    }
  }, [offset]);

  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setOffset({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    } else if (dragging === 'node' && draggingNodeId) {
      const dx = (e.clientX - dragStart.x) / scale;
      const dy = (e.clientY - dragStart.y) / scale;
      const updatedNodes = nodes.map(n => {
        if (n.id === draggingNodeId) {
          return { ...n, pos: [n.pos[0] + dx, n.pos[1] + dy] };
        }
        return n;
      });
      setDragStart({ x: e.clientX, y: e.clientY });
      onChange({ ...workflow, nodes: updatedNodes });
    }
  }, [isPanning, panStart, dragging, dragStart, scale, nodes, workflow, onChange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setDraggingNodeId(null);
    setIsPanning(false);
  }, []);

  const [draggingNodeId, setDraggingNodeId] = useState(null);

  const handleNodeDragStart = useCallback((e, nodeId) => {
    e.stopPropagation();
    setDragging('node');
    setDraggingNodeId(nodeId);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleContextMenu = useCallback((e, node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const handleEditNode = useCallback((node) => {
    setEditingNode(node);
    setContextMenu(null);
  }, []);

  const handleSaveNode = useCallback((updatedNode) => {
    const updatedNodes = nodes.map(n => n.id === updatedNode.id ? updatedNode : n);
    onChange({ ...workflow, nodes: updatedNodes });
    setEditingNode(null);
  }, [nodes, workflow, onChange]);

  const handleDeleteNode = useCallback(() => {
    if (!contextMenu) return;
    const updatedNodes = nodes.filter(n => n.id !== contextMenu.nodeId);
    const updatedEdges = edges.filter(e => e.from !== contextMenu.nodeId && e.to !== contextMenu.nodeId);
    onChange({ nodes: updatedNodes, edges: updatedEdges });
    setContextMenu(null);
    setSelectedNodeId(null);
  }, [contextMenu, nodes, edges, workflow, onChange]);

  const handleDuplicateNode = useCallback(() => {
    if (!contextMenu) return;
    const original = nodes.find(n => n.id === contextMenu.nodeId);
    if (!original) return;
    const newNode = {
      ...original,
      id: genNodeId(),
      pos: [original.pos[0] + 30, original.pos[1] + 30],
      properties: { ...original.properties }
    };
    const updatedNodes = [...nodes, newNode];
    onChange({ ...workflow, nodes: updatedNodes });
    setContextMenu(null);
    setSelectedNodeId(newNode.id);
  }, [contextMenu, nodes, workflow, onChange]);

  // Add node from palette
  const handleAddNode = useCallback((type) => {
    const colors = getNodeColors(type);
    const newNode = {
      id: genNodeId(),
      type,
      pos: [
        (-offset.x + canvasSize.width / 2) / scale,
        (-offset.y + canvasSize.height / 2) / scale
      ],
      size: [NODE_WIDTH, NODE_HEIGHT],
      properties: { name: type }
    };
    onChange({ ...workflow, nodes: [...nodes, newNode] });
    setSelectedNodeId(newNode.id);
  }, [offset, scale, canvasSize, nodes, workflow, onChange]);

  // Auto-layout
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    const { autoLayout } = require('../utils/workflowConverter');
    const positions = new Map();
    const HORIZONTAL_GAP = 280;
    const VERTICAL_GAP = 130;
    const START_X = 100;
    const START_Y = 80;

    // Simple left-to-right layout
    const sortedNodes = [...nodes].sort((a, b) => a.pos[0] - b.pos[0] || a.pos[1] - b.pos[1]);
    sortedNodes.forEach((node, index) => {
      positions.set(node.id, [START_X + Math.floor(index / 5) * HORIZONTAL_GAP, START_Y + (index % 5) * VERTICAL_GAP]);
    });

    const updatedNodes = nodes.map(n => ({
      ...n,
      pos: positions.get(n.id) || n.pos
    }));
    onChange({ ...workflow, nodes: updatedNodes });
  }, [nodes, workflow, onChange]);

  // Connect nodes
  const handleConnect = useCallback((fromId, toId) => {
    if (fromId === toId) return;
    const existingEdge = edges.find(e => e.from === fromId && e.to === toId);
    if (existingEdge) return;
    const newEdge = { from: fromId, from_slot: 0, to: toId, to_slot: 0 };
    onChange({ ...workflow, edges: [...edges, newEdge] });
  }, [edges, workflow, onChange]);

  // Connect mode
  const [connectFrom, setConnectFrom] = useState(null);

  const zoomIn = () => setScale(s => Math.min(s * 1.15, 2.5));
  const zoomOut = () => setScale(s => Math.max(s * 0.85, 0.2));
  const zoomReset = () => { setScale(1); setOffset({ x: 50, y: 50 }); };

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      {/* Node Palette */}
      <div className="w-52 bg-slate-800/70 border-r border-slate-700 p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">节点</h3>
          <button onClick={handleAutoLayout}
            className="text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
            </svg>
            自动布局
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {NODE_PALETTE.map(item => (
            <button
              key={item.type}
              onClick={() => handleAddNode(item.type)}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 border border-transparent hover:border-slate-600 transition-all group"
              title={item.label}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: getNodeColors(item.type).bg + '30' }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke={getNodeColors(item.type).bg} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              <span className="text-[10px] text-slate-300 font-medium">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Node list */}
        <div className="mt-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">画布节点</h3>
          <div className="space-y-1">
            {nodes.map(node => {
              const colors = getNodeColors(node.type);
              return (
                <div key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-2 rounded-lg cursor-pointer transition-all ${selectedNodeId === node.id ? 'bg-violet-600/20 border border-violet-500/50' : 'bg-slate-700/30 border border-transparent hover:bg-slate-700/50'}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors.bg }} />
                    <span className="text-xs text-slate-200 truncate">{node.properties?.name || node.type}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 ml-4">{node.type}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Toolbar */}
        <div className="absolute top-3 left-3 flex items-center gap-2 bg-slate-800/95 border border-slate-600 rounded-xl p-1.5 z-10 shadow-xl">
          <button onClick={zoomOut} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="缩小 (-)">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          {/* Zoom Slider */}
          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min="25"
              max="200"
              value={Math.round(scale * 100)}
              onChange={(e) => {
                setScale(prevScale => {
                  const newScale = parseInt(e.target.value) / 100;
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (rect) {
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    const worldX = (centerX - offset.x) / prevScale;
                    const worldY = (centerY - offset.y) / prevScale;
                    setOffset({ x: centerX - worldX * newScale, y: centerY - worldY * newScale });
                  }
                  return newScale;
                });
              }}
              className="w-24 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
            />
            <span className="text-xs text-slate-400 w-12 text-center font-mono">{Math.round(scale * 100)}%</span>
          </div>
          
          <button onClick={zoomIn} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="放大 (+)">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          
          <div className="w-px h-5 bg-slate-600 mx-0.5" />
          
          {/* Fit to View */}
          <button onClick={() => {
            if (nodes.length === 0) return;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            nodes.forEach(node => {
              const [x, y] = node.pos;
              const [w, h] = node.size || [NODE_WIDTH, NODE_HEIGHT];
              minX = Math.min(minX, x); minY = Math.min(minY, y);
              maxX = Math.max(maxX, x + w); maxY = Math.max(maxY, y + h);
            });
            const contentW = maxX - minX + 100;
            const contentH = maxY - minY + 100;
            const newScale = Math.min(canvasSize.width / contentW, canvasSize.height / contentH, 1.5);
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            setScale(newScale);
            setOffset({
              x: canvasSize.width / 2 - centerX * newScale,
              y: canvasSize.height / 2 - centerY * newScale
            });
          }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="适应视图">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          
          <button onClick={zoomReset} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition" title="重置视图">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* SVG Canvas */}
        <svg width="100%" height="100%" className="bg-slate-950"
          style={{ cursor: isPanning ? 'grabbing' : (dragging === 'node' ? 'grabbing' : 'default') }}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <pattern id="gridLarge" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#grid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#2d3748" strokeWidth="0.5" />
            </pattern>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>

          <g transform={`translate(${offset.x}, ${offset.y}) scale(${scale})`}>
            <rect x="-5000" y="-5000" width="10000" height="10000" fill="url(#gridLarge)" />

            {/* Edges */}
            <g>
              {edges.map((edge, i) => (
                <Edge key={`${edge.from}-${edge.to}-${i}`} edge={edge} nodes={nodes} />
              ))}
            </g>

            {/* Nodes */}
            <g>
              {nodes.map(node => (
                <Node
                  key={node.id}
                  node={node}
                  isSelected={selectedNodeId === node.id}
                  onSelect={setSelectedNodeId}
                  onDoubleClick={handleEditNode}
                  onContextMenu={handleContextMenu}
                  onDragStart={handleNodeDragStart}
                />
              ))}
            </g>
          </g>
        </svg>

        {/* MiniMap */}
        <MiniMap nodes={nodes} scale={scale} offset={offset} canvasSize={canvasSize} />

        {/* Context Menu */}
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x} y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onEdit={() => {
              const node = nodes.find(n => n.id === contextMenu.nodeId);
              if (node) handleEditNode(node);
            }}
            onDelete={handleDeleteNode}
            onDuplicate={handleDuplicateNode}
          />
        )}

        {/* Node Edit Modal */}
        {editingNode && (
          <NodeEditModal
            node={editingNode}
            onSave={handleSaveNode}
            onClose={() => setEditingNode(null)}
            allNodes={nodes}
          />
        )}

        {/* Selected Node Info Panel */}
        {selectedNode && !editingNode && (
          <div className="absolute bottom-3 left-3 bg-slate-800/95 border border-slate-600 rounded-xl p-3.5 max-w-xs shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getNodeColors(selectedNode.type).bg }} />
              <span className="text-sm font-semibold text-white">{selectedNode.properties?.name || selectedNode.type}</span>
              <span className="text-xs text-slate-400 ml-auto px-2 py-0.5 bg-slate-700 rounded">{selectedNode.type}</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              {selectedNode.properties?.agent && <div>Agent: {selectedNode.properties.agent}</div>}
              {selectedNode.properties?.prompt && <div className="truncate">Prompt: {selectedNode.properties.prompt}</div>}
              {selectedNode.properties?.model && <div>Model: {selectedNode.properties.model}</div>}
              {selectedNode.properties?.condition && <div>Condition: **{selectedNode.properties.condition}</div>}
            </div>
            <button onClick={() => handleEditNode(selectedNode)}
              className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              双击节点或点击此处编辑
            </button>
          </div>
        )}

        {/* Empty state */}
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto mb-4 border border-slate-700">
                <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm mb-1">画布为空</p>
              <p className="text-slate-500 text-xs">从左侧节点面板拖放或点击添加节点</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
