// Analytics dashboard: loads the /api/admin/* endpoints and renders them.
// The browser asks for the admin Basic-auth login on the first 401 and reuses it after that.

const dashboard = {
  /**
   * Fetch one admin endpoint as JSON; throws on any non-2xx response
   * @param {string} url - path under /api/admin
   * @returns {Promise<object>}
   */
  async getJson(url) {
    const res = await fetch(url, { headers: adminCommon.getAuthHeader() })
    if (!res.ok) throw new Error(url + ' ' + res.status)
    return res.json()
  },

  /**
   * Render a list of label/value rows as horizontal bars
   * @param {string} id - container id
   * @param {Array<{label: string, value: number}>} rows
   */
  renderBars(id, rows) {
    const box = document.getElementById(id)
    const max = Math.max(1, ...rows.map(r => r.value))

    if (!rows.length) {
      box.innerHTML = '<p class="text--muted">No data for this range</p>'
      return
    }

    box.innerHTML = rows.map(r => `
      <div class="bar-row">
        <span class="bar-row__label">${adminCommon.escape(r.label)}</span>
        <span class="bar-row__track"><span class="bar-row__fill" style="width:${(r.value / max * 100).toFixed(1)}%"></span></span>
        <span class="bar-row__value">${adminCommon.formatNumber(r.value)}</span>
      </div>`).join('')
  },

  /**
   * Fill the table body with rows, or a message when empty
   * @param {string} id - tbody id
   * @param {number} cols - number of columns
   * @param {string[][]} rows - cell html per row (already escaped)
   */
  renderTable(id, cols, rows) {
    const body = document.getElementById(id)

    body.innerHTML = rows.length
      ? rows.map(cells => '<tr>' + cells.map((c, i) => `<td${i ? ' align="right"' : ''}>${c}</td>`).join('') + '</tr>').join('')
      : `<tr><td colspan="${cols}" class="text--muted">No data for this range</td></tr>`
  },

  /**
   * Load the summary cards (fixed to today and this week)
   */
  async loadSummary() {
    const s = await this.getJson('/api/admin/summary')

    document.getElementById('sessionsToday').textContent = adminCommon.formatNumber(s.today.sessions)
    document.getElementById('sessionsWeek').textContent = adminCommon.formatNumber(s.week.sessions) + ' this week'
    document.getElementById('usersToday').textContent = adminCommon.formatNumber(s.today.users)
    document.getElementById('usersWeek').textContent = adminCommon.formatNumber(s.week.users) + ' this week'
    document.getElementById('watchToday').textContent = adminCommon.formatHours(s.today.watch_hours)
    document.getElementById('watchWeek').textContent = adminCommon.formatHours(s.week.watch_hours) + ' this week'
    document.getElementById('activeDevices').textContent = adminCommon.formatNumber(s.devices_active_24h)
  },

  /**
   * Load the games and watch-time charts for the selected range
   * @param {string} range - key from the time range select
   */
  async loadCharts(range) {
    const { from, to } = adminCommon.getDateRange(range)
    const q = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`

    const [games, watch] = await Promise.all([
      this.getJson(`/api/admin/metrics?metric=games&${q}`),
      this.getJson(`/api/admin/metrics?metric=watch-time&${q}`)
    ])

    this.renderBars('gamesChart', games.data.map(g => ({ label: g.game_id, value: g.play_count })))
    this.renderBars('watchTypeChart', watch.data.map(w => ({ label: w.media_type, value: Math.round(w.total_seconds / 60) })))
  },

  /**
   * Load the 7-day trending tables
   */
  async loadTrending() {
    const t = await this.getJson('/api/admin/trending?days=7')

    this.renderTable('trendingGamesBody', 3, (t.games || []).map(g => [
      adminCommon.escape(g.game_id),
      adminCommon.formatNumber(g.plays),
      adminCommon.formatNumber(g.unique_users)
    ]))

    this.renderTable('topReactionsBody', 4, (t.reactions || []).map(r => [
      adminCommon.escape(r.card_id),
      adminCommon.formatNumber(r.likes),
      adminCommon.formatNumber(r.dislikes),
      r.ratio + '%'
    ]))
  },

  /**
   * Reload every section and stamp the last update time
   */
  async refresh() {
    const range = document.getElementById('timeRange').value

    try {
      await Promise.all([this.loadSummary(), this.loadCharts(range), this.loadTrending()])
      document.getElementById('lastUpdate').textContent = new Date().toLocaleString()
    } catch (e) {
      console.error('Dashboard load failed:', e.message)
      document.getElementById('lastUpdate').textContent = 'failed: ' + e.message
    }
  },

  init() {
    document.getElementById('refreshBtn').addEventListener('click', () => this.refresh())
    document.getElementById('timeRange').addEventListener('change', () => this.refresh())
    this.refresh()
  }
}

dashboard.init()
