const STATUS_CONFIG = {
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400', label: '等待中' },
  running: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500 animate-pulse', label: '执行中' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: '已完成' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: '失败' }
}

export { STATUS_CONFIG }

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}