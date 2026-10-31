// Shared admin utilities

const adminCommon = {
  /**
   * Parse auth from URL if needed (for basic auth)
   */
  getAuthHeader() {
    // Auth is handled by browser/server for /api/admin/* endpoints
    return {}
  },

  /**
   * Escape HTML to prevent XSS
   */
  escape(str) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return String(str).replace(/[&<>"']/g, c => map[c])
  },

  /**
   * Format large numbers with K/M suffixes
   */
  formatNumber(num) {
    if (typeof num !== 'number') return '—'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toLocaleString()
  },

  /**
   * Format hours as "Xh Ym"
   */
  formatHours(hours) {
    if (typeof hours !== 'number') return '—'
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    if (h === 0) return m + 'm'
    if (m === 0) return h + 'h'
    return h + 'h ' + m + 'm'
  },

  /**
   * Format time range for display
   */
  formatTimeRange(from, to) {
    const start = new Date(from)
    const end = new Date(to)
    const sameDay = start.toDateString() === end.toDateString()

    if (sameDay) {
      return start.toLocaleDateString()
    }
    return start.toLocaleDateString() + ' to ' + end.toLocaleDateString()
  },

  /**
   * Get date range based on string key
   */
  getDateRange(key) {
    const now = new Date()
    let start

    switch (key) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '7days':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30days':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    return {
      from: start.toISOString(),
      to: now.toISOString(),
      label: key
    }
  }
}
