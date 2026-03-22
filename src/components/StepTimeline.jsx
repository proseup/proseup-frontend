import { useState } from 'react'
import { STATUS_CONFIG } from './StatusBadge'

export function StepTimeline({ steps }) {
  const [expandedStep, setExpandedStep] = useState(null)

  return (
    <div className="relative">
      {/* Vertical Line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const config = STATUS_CONFIG[step.status] || STATUS_CONFIG.pending
          const isExpanded = expandedStep === step.id
          const isLast = index === steps.length - 1

          return (
            <div key={step.id} className="relative pl-10">
              {/* Dot */}
              <div
                className={`absolute left-2 top-2 w-4 h-4 rounded-full border-2 border-white ${config.dot} ${
                  isLast && step.status === 'pending' ? 'bg-gray-300' : ''
                }`}
                style={{ boxShadow: '0 0 0 2px ' + (config.dot.includes('animate-pulse') ? '#3b82f6' : config.dot.replace('animate-pulse', '').trim()) }}
              />

              {/* Content */}
              <div
                className={`bg-white rounded-lg border transition-all cursor-pointer ${
                  isExpanded ? 'border-indigo-300 shadow-md' : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setExpandedStep(isExpanded ? null : step.id)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900">{step.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {step.duration && (
                        <span className="text-sm text-gray-500">{step.duration}</span>
                      )}
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                      {step.input && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">输入</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 font-mono">
                            {step.input}
                          </div>
                        </div>
                      )}
                      {step.output && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">输出</div>
                          <div className="text-sm text-gray-700 bg-gray-50 rounded p-2 font-mono">
                            {step.output}
                          </div>
                        </div>
                      )}
                      {step.logs && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">日志</div>
                          <div className="text-sm text-gray-700 bg-gray-900 text-gray-300 rounded p-2 font-mono max-h-32 overflow-auto">
                            {step.logs}
                          </div>
                        </div>
                      )}
                      {step.started_at && (
                        <div className="text-xs text-gray-400">
                          开始时间: {new Date(step.started_at).toLocaleString('zh-CN')}
                          {step.finished_at && (
                            <> · 结束时间: {new Date(step.finished_at).toLocaleString('zh-CN')}</>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}