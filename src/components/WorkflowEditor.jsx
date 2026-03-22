import { useState, useEffect, useCallback } from 'react';
import { ProseEditor } from './ProseEditor';
import { NodeEditor } from './NodeEditor';
import { proseToComfyUI, comfyUIToProse } from '../utils/workflowConverter';

export function WorkflowEditor({ value, onChange, placeholder }) {
  const [mode, setMode] = useState('text'); // 'text' | 'canvas'
  const [workflow, setWorkflow] = useState({ nodes: [], edges: [] });
  const [lastSyncedProse, setLastSyncedProse] = useState(value);

  // Parse prose to workflow when switching to canvas mode
  useEffect(() => {
    if (mode === 'canvas' && value !== lastSyncedProse) {
      const newWorkflow = proseToComfyUI(value);
      setWorkflow(newWorkflow);
      setLastSyncedProse(value);
    } else if (mode === 'canvas' && workflow.nodes.length === 0) {
      const newWorkflow = proseToComfyUI(value);
      setWorkflow(newWorkflow);
    }
  }, [mode, value, lastSyncedProse]);

  // Handle prose text changes
  const handleProseChange = useCallback((newProse) => {
    setLastSyncedProse(newProse);
    onChange(newProse);
  }, [onChange]);

  // Handle canvas workflow changes
  const handleWorkflowChange = useCallback((newWorkflow) => {
    setWorkflow(newWorkflow);
    const newProse = comfyUIToProse(newWorkflow);
    if (newProse) {
      setLastSyncedProse(newProse);
      onChange(newProse);
    }
  }, [onChange]);

  // Convert workflow back to prose when switching to text mode
  const handleSwitchToText = useCallback(() => {
    const newProse = comfyUIToProse(workflow);
    if (newProse && newProse !== value) {
      setLastSyncedProse(newProse);
      onChange(newProse);
    }
    setMode('text');
  }, [workflow, value, onChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Tab Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center gap-1 bg-gray-900 rounded-lg p-1">
          <button
            onClick={() => setMode('text')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'text'
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              文本模式
            </span>
          </button>
          <button
            onClick={() => setMode('canvas')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              mode === 'canvas'
                ? 'bg-gray-700 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              画布模式
            </span>
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {mode === 'text' ? (
            '使用 .prose 语法编辑工作流'
          ) : (
            '可视化流程图 · 双击节点编辑属性'
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 min-h-0">
        {mode === 'text' ? (
          <div className="h-full p-4">
            <ProseEditor
              value={value}
              onChange={handleProseChange}
              placeholder={placeholder}
            />
          </div>
        ) : (
          <div className="h-full p-4">
            <NodeEditor
              workflow={workflow}
              onChange={handleWorkflowChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
