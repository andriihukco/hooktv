/**
 * GET /api/admin/trending: Trending games and content
 * Query params:
 *   - days: number (default: 7)
 *   - type: 'games' | 'reactions' | 'all' (default: all)
 *   - limit: number (default: 10)
 */

const { checkAuth } = require('./auth')

module.exports = async function handler(req, res) {
  if (!checkAuth(req, res)) return

  const { days = '7', type = 'all', limit = '10' } = req.query
  const base = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY

  if (!base || !key) {
    res.status(503).json({ error: 'Supabase is not configured' })
    return
  }

  try {
    const daysInt = Math.max(1, Math.min(90, parseInt(days) || 7))
    const limitInt = Math.max(1, Math.min(100, parseInt(limit) || 10))
    const startDate = new Date(Date.now() - daysInt * 24 * 60 * 60 * 1000).toISOString()

    const results = {}

    if (type === 'games' || type === 'all') {
      // Most played games in the period
      const gamesRes = await fetch(
        `${base}/rest/v1/analytics_sessions?select=game_id,user_id&media_type=eq.game&started_at=gte.${startDate}&order=started_at.desc`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      )

      if (gamesRes.ok) {
        const sessions = await gamesRes.json()
        const gameStats = {}

        sessions.forEach(s => {
          if (s.game_id) {
            if (!gameStats[s.game_id]) gameStats[s.game_id] = { plays: 0, users: new Set() }
            gameStats[s.game_id].plays++
            gameStats[s.game_id].users.add(s.user_id)
          }
        })

        results.games = Object.entries(gameStats)
          .map(([id, stat]) => ({
            game_id: id,
            plays: stat.plays,
            unique_users: stat.users.size
          }))
          .sort((a, b) => b.plays - a.plays)
          .slice(0, limitInt)
      }
    }

    if (type === 'reactions' || type === 'all') {
      // Top rated content
      const reactionsRes = await fetch(
        `${base}/rest/v1/reactions?select=card_id,vote&updated_at=gte.${startDate}`,
        { headers: { apikey: key, Authorization: `Bearer ${key}` } }
      )

      if (reactionsRes.ok) {
        const reactions = await reactionsRes.json()
        const contentStats = {}

        reactions.forEach(r => {
          if (!contentStats[r.card_id]) contentStats[r.card_id] = { likes: 0, dislikes: 0 }
          if (r.vote === 1) contentStats[r.card_id].likes++
          else if (r.vote === -1) contentStats[r.card_id].dislikes++
        })

        results.reactions = Object.entries(contentStats)
          .map(([id, stat]) => ({
            card_id: id,
            likes: stat.likes,
            dislikes: stat.dislikes,
            ratio: stat.likes + stat.dislikes > 0
              ? (stat.likes / (stat.likes + stat.dislikes) * 100).toFixed(1)
              : 0
          }))
          .filter(r => r.likes + r.dislikes > 0)
          .sort((a, b) => b.likes - a.likes)
          .slice(0, limitInt)
      }
    }

    res.setHeader('Cache-Control', 'private, no-store') // admin data: never in a shared cache
    res.status(200).json({
      metric: 'trending',
      days: daysInt,
      timestamp: new Date().toISOString(),
      ...results
    })
  } catch (e) {
    console.error('Trending error:', e.message)
    res.status(502).json({ error: 'Failed to fetch trending: ' + e.message })
  }
}
