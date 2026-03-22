/**
 * ProseUp API Worker
 * Cloudflare Worker backend for GitHub OAuth and API routes
 */

import { signJWT, verifyJWT } from './jwt.js'
import { getGitHubAuthURL, exchangeCodeForToken, getGitHubUser, generateState } from './auth.js'

const GITHUB_CLIENT_ID = GITHUB_CLIENT_ID || ''
const GITHUB_CLIENT_SECRET = GITHUB_CLIENT_SECRET || ''
const JWT_SECRET = JWT_SECRET || ''
const FRONTEND_URL = FRONTEND_URL || 'https://proseup.pages.dev'
const GITHUB_CALLBACK_URL = `${FRONTEND_URL}/auth/github/callback`

const SESSION_COOKIE_NAME = 'proseup_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Mock executions data (replace with actual KV/DB in production)
const MOCK_EXECUTIONS = [
  { id: 'exec_001', name: '数据处理管道', status: 'completed', created_at: '2026-03-20T10:30:00Z', steps: 5 },
  { id: 'exec_002', name: '报告生成流程', status: 'running', created_at: '2026-03-21T14:20:00Z', steps: 3 },
  { id: 'exec_003', name: '内容分析任务', status: 'failed', created_at: '2026-03-22T09:15:00Z', steps: 2 }
]

async function handleAuthGithub(request) {
  const state = generateState()
  const authUrl = getGitHubAuthURL(GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL, state)

  return Response.redirect(authUrl, 302)
}

async function handleAuthGithubCallback(request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    return Response.redirect(`${FRONTEND_URL}/login?error=${encodeURIComponent(error)}`, 302)
  }

  if (!code) {
    return Response.redirect(`${FRONTEND_URL}/login?error=no_code`, 302)
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)

    // Get GitHub user info
    const githubUser = await getGitHubUser(accessToken)
    const emails = await getGitHubEmails(accessToken)

    // Create user payload
    const userPayload = {
      id: githubUser.id.toString(),
      login: githubUser.login,
      name: githubUser.name || githubUser.login,
      email: emails[0]?.email || githubUser.email || `${githubUser.login}@github.local`,
      avatar_url: githubUser.avatar_url,
      github_url: githubUser.html_url
    }

    // Sign JWT
    const token = await signJWT(
      { user: userPayload },
      JWT_SECRET,
      '7d'
    )

    // Create response with redirect
    const response = Response.redirect(`${FRONTEND_URL}/console`, 302)

    // Set HttpOnly cookie
    response.headers.set('Set-Cookie',
      `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
    )

    return response
  } catch (err) {
    console.error('GitHub OAuth error:', err)
    return Response.redirect(`${FRONTEND_URL}/login?error=auth_failed`, 302)
  }
}

async function handleAuthLogout(request) {
  const response = Response.redirect(`${FRONTEND_URL}/login`, 302)
  response.headers.set('Set-Cookie',
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  )
  return response
}

async function handleAuthMe(request) {
  const token = getCookie(request, SESSION_COOKIE_NAME)

  if (!token) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const payload = await verifyJWT(token, JWT_SECRET)

  if (!payload) {
    return jsonResponse({ error: 'Invalid token' }, 401)
  }

  return jsonResponse({ user: payload.user })
}

async function handleApiExecutions(request) {
  // Check authentication
  const authResult = await authenticate(request)
  if (authResult.error) {
    return jsonResponse({ error: authResult.error }, 401)
  }

  if (request.method === 'GET') {
    // Return mock executions
    return jsonResponse({ executions: MOCK_EXECUTIONS })
  }

  if (request.method === 'POST') {
    // Create new execution (mock)
    const body = await request.json().catch(() => ({}))
    const newExecution = {
      id: `exec_${Date.now()}`,
      name: body.name || '新执行',
      status: 'pending',
      created_at: new Date().toISOString(),
      steps: 0
    }
    return jsonResponse({ execution: newExecution }, 201)
  }

  return jsonResponse({ error: 'Method not allowed' }, 405)
}

async function handleApiExecutionById(request, id) {
  // Check authentication
  const authResult = await authenticate(request)
  if (authResult.error) {
    return jsonResponse({ error: authResult.error }, 401)
  }

  const execution = MOCK_EXECUTIONS.find(e => e.id === id)

  if (!execution) {
    return jsonResponse({ error: 'Execution not found' }, 404)
  }

  return jsonResponse({ execution })
}

async function authenticate(request) {
  const token = getCookie(request, SESSION_COOKIE_NAME)

  if (!token) {
    return { error: 'No session cookie' }
  }

  const payload = await verifyJWT(token, JWT_SECRET)

  if (!payload) {
    return { error: 'Invalid session' }
  }

  return { user: payload.user }
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
  return cookies[name]
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': FRONTEND_URL,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}

async function handleRequest(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': FRONTEND_URL,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  // Auth routes
  if (pathname === '/auth/github' && request.method === 'GET') {
    return handleAuthGithub(request)
  }

  if (pathname === '/auth/github/callback' && request.method === 'GET') {
    return handleAuthGithubCallback(request)
  }

  if (pathname === '/auth/logout' && request.method === 'POST') {
    return handleAuthLogout(request)
  }

  if (pathname === '/auth/me' && request.method === 'GET') {
    return handleAuthMe(request)
  }

  // API routes
  if (pathname === '/api/executions' && request.method.match(/GET|POST/)) {
    return handleApiExecutions(request)
  }

  const executionMatch = pathname.match(/^\/api\/executions\/(.+)$/)
  if (executionMatch && request.method === 'GET') {
    return handleApiExecutionById(request, executionMatch[1])
  }

  // Health check
  if (pathname === '/health') {
    return jsonResponse({ status: 'ok' })
  }

  // 404
  return jsonResponse({ error: 'Not found' }, 404)
}

export default {
  async fetch(request, env, ctx) {
    // Bind environment variables
    Object.assign(globalThis, {
      GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
      JWT_SECRET: env.JWT_SECRET,
      FRONTEND_URL: env.FRONTEND_URL
    })

    return handleRequest(request)
  }
}
