/**
 * GET /api/admin/metrics: Analytics metrics for dashboard
 * Query params:
 *   - metric: 'games' | 'watch-time' | 'daily-active' | 'top-games' | 'session-stats' | 'trending'
 *   - from: ISO date string (default: 7 days ago)
 *   - to: ISO date string (default: now)
 *   - limit: number (default: 10, max: 100)
 */

const { checkAuth } = require('./auth')

const METRICS = {
  games: 'get_games_played',
  'watch-time': 'get_watch_time_by_type',
  'daily-active': 'get_daily_active_users',
  'top-games': 'get_top_games',
  'session-stats': 'get_session_stats'
}

async function callMetricFunction(supabaseUrl, serviceKey, functionName, params) {
  const query = new URLSearchParams()

  if (params.from) query.append('p_start_date', params.from)
  if (params.to) query.append('p_end_date', params.to)
  if (params.limit) query.append('p_limit', params.limit)
  if (params.days) query.append('p_days', params.days)

  const res = await fetch(
    `${supabaseUrl}/rest/v1/rpc/${functionName}?${query}`,
    {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    }
  )

  if (!res.ok) throw new Error(`RPC failed: ${res.status}`)
  return res.json()
}

function getDateRange(from, to) {
  const end = to ? new Date(to) : new Date()
  const start = from ? new Date(from) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    from: start.toISOString(),
    to: end.toISOString()
  }
}

module.exports = async function handler(req, res) {
  if (!checkAuth(req, res)) return

  const { metric, from, to, limit = '10', days = '7' } = req.query
  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!base || !key) {
    res.status(503).json({ error: 'Supabase is not configured' })
    return
  }

  if (!metric || !METRICS[metric]) {
    res.status(400).json({
      error: 'Invalid metric',
      available: Object.keys(METRICS)
    })
    return
  }

  try {
    const dateRange = getDateRange(from, to)
    const functionName = METRICS[metric]

    let data

    if (metric === 'session-stats') {
      data = await callMetricFunction(base, key, functionName, dateRange)
    } else if (metric === 'top-games') {
      data = await callMetricFunction(base, key, functionName, { days: parseInt(days), limit: parseInt(limit) })
    } else {
      data = await callMetricFunction(base, key, functionName, { ...dateRange, limit: parseInt(limit) })
    }

    res.setHeader('Cache-Control', 'private, no-store') // admin data: never in a shared cache
    res.status(200).json({
      metric,
      timestamp: new Date().toISOString(),
      dateRange,
      data: Array.isArray(data) ? data : [data]
    })
  } catch (e) {
    console.error('Metrics error:', e.message)
    res.status(502).json({ error: 'Failed to fetch metrics: ' + e.message })
  }
}
