import { useState, useEffect, useCallback } from 'react';
import { ProseEditor } from './ProseEditor';
import { CanvasEditor } from './CanvasEditor';
import { proseToComfyUI, comfyUIToProse } from '../utils/workflowConverter';

/**
 * @typedef {Object} WorkflowEditorProps
 * @property {string} value - The .prose text content
 * @property {(value: string) => void} onChange - Callback when text changes
 * @property {string} [placeholder]
 */

export function WorkflowEditor({ value, onChange, placeholder }) {
  const [mode, setMode] = useState('text'); // 'text' | 'canvas'
  const [workflow, setWorkflow] = useState({ nodes: [], edges: [] });
  const [lastSyncedProse, setLastSyncedProse] = useState(value);
  const [lastSyncedWorkflow, setLastSyncedWorkflow] = useState(null);

  // Parse prose to workflow when switching to canvas mode
  useEffect(() => {
    if (mode === 'canvas') {
      // Only re-parse if prose has changed since last sync
      if (value !== lastSyncedProse) {
        const newWorkflow = proseToComfyUI(value);
        setWorkflow(newWorkflow);
        setLastSyncedProse(value);
        setLastSyncedWorkflow(JSON.stringify(newWorkflow));
      } else if (!lastSyncedWorkflow) {
        // First time entering canvas mode
        const newWorkflow = proseToComfyUI(value);
        setWorkflow(newWorkflow);
        setLastSyncedWorkflow(JSON.stringify(newWorkflow));
      }
    }
  }, [mode, value, lastSyncedProse, lastSyncedWorkflow]);

  // Handle prose text changes
  const handleProseChange = useCallback((newProse) => {
    setLastSyncedProse(newProse);
    onChange(newProse);
  }, [onChange]);

  // Handle canvas workflow changes
  const handleWorkflowChange = useCallback((newWorkflow) => {
    setWorkflow(newWorkflow);
    setLastSyncedWorkflow(JSON.stringify(newWorkflow));
  }, []);

  // Convert workflow back to prose when switching to text mode
  const handleSwitchToText = useCallback(() => {
    // Save current canvas state
    const currentWorkflowJson = JSON.stringify(workflow);
    if (currentWorkflowJson !== lastSyncedWorkflow) {
      const newProse = comfyUIToProse(workflow);
      setLastSyncedProse(newProse);
      onChange(newProse);
    }
    setMode('text');
  }, [workflow, lastSyncedWorkflow, onChange]);

  // Prepare workflow for canvas (ensure it has proper structure)
  const canvasWorkflow = mode === 'canvas' ? workflow : { nodes: [], edges: [] };

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
            '拖拽节点编辑工作流，双击节点修改属性'
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
            <CanvasEditor
              workflow={canvasWorkflow}
              onChange={handleWorkflowChange}
            />
          </div>
        )}
      </div>

      {/* Sync indicator */}
      {mode === 'canvas' && value !== lastSyncedProse && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            画布内容与文本不同步，切换到文本模式将应用画布更改
          </div>
        </div>
      )}
    </div>
  );
}
