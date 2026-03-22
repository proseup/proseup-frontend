import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_BASE = 'https://api.proseup.cn'

export function Login() {
  const { login } = useAuth()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages = {
    auth_failed: '授权失败，请重试',
    no_code: '授权码缺失，请重试',
    denied: '您取消了授权',
    default: '登录失败，请重试'
  }

  const getErrorMessage = () => {
    if (!error) return null
    return errorMessages[error] || errorMessages.default
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative text-center max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <span className="text-white font-semibold text-2xl">proseup</span>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-800 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold text-white mb-2">欢迎回来</h1>
          <p className="text-slate-400 mb-8">登录您的账户以继续使用 proseup</p>

          {getErrorMessage() && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {getErrorMessage()}
            </div>
          )}

          {/* GitHub Login Button */}
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            使用 GitHub 登录
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-slate-500 text-sm">或</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Demo Mode */}
          <button
            onClick={() => window.location.href = '/console'}
            className="w-full px-6 py-4 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-700"
          >
            演示模式（无需登录）
          </button>
        </div>

        {/* Footer */}
        <p className="text-slate-500 text-sm mt-6">
          登录即表示您同意我们的
          <a href="#" className="text-violet-400 hover:text-violet-300 mx-1">服务条款</a>
          和
          <a href="#" className="text-violet-400 hover:text-violet-300 mx-1">隐私政策</a>
        </p>
      </div>
    </div>
  )
}
