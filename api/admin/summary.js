/**
 * GET /api/admin/summary: Quick summary stats for the dashboard header
 */

const { checkAuth } = require('./auth')

module.exports = async function handler(req, res) {
  if (!checkAuth(req, res)) return

  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!base || !key) {
    res.status(503).json({ error: 'Supabase is not configured' })
    return
  }

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Today's stats
    const todayRes = await fetch(
      `${base}/rest/v1/rpc/get_session_stats`,
      {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_start_date: today, p_end_date: now.toISOString() })
      }
    )
    const todayStats = todayRes.ok ? (await todayRes.json())[0] : null

    // This week's stats
    const weekRes = await fetch(
      `${base}/rest/v1/rpc/get_session_stats`,
      {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_start_date: weekAgo, p_end_date: now.toISOString() })
      }
    )
    const weekStats = weekRes.ok ? (await weekRes.json())[0] : null

    // Active devices (last 24h)
    const devicesRes = await fetch(
      `${base}/rest/v1/devices?select=user_id&last_seen=gte.${new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()}`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    )
    const devices = devicesRes.ok ? await devicesRes.json() : []
    const activeDevices = new Set(devices.map(d => d.user_id)).size

    res.setHeader('Cache-Control', 'private, no-store') // admin data: never in a shared cache
    res.status(200).json({
      timestamp: new Date().toISOString(),
      today: {
        sessions: todayStats?.session_count || 0,
        users: todayStats?.unique_users || 0,
        watch_hours: todayStats?.total_watch_time_hours || 0
      },
      week: {
        sessions: weekStats?.session_count || 0,
        users: weekStats?.unique_users || 0,
        watch_hours: weekStats?.total_watch_time_hours || 0
      },
      devices_active_24h: activeDevices
    })
  } catch (e) {
    console.error('Summary error:', e.message)
    res.status(502).json({ error: 'Failed to fetch summary: ' + e.message })
  }
}
