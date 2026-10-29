(function () {
    'use strict'

    /**
     * Lampa Plugin: JacRed Real Stream Provider
     * Architecture: Direct API Integration + TorrServer Linker
     *
     * Fallback chain when the main search finds nothing:
     *   1. JacRed mirrors, retried with alternative queries (original title, title + year, IMDb id)
     *   2. TorrServer's own /search/ endpoint (if a TorrServer URL is configured in Lampa)
     *   3. Native Lampa torrents list for the same title, or a manual retry
     */

    let CONFIG = {
        id: 'jacred_hub',
        title: 'JacRed P2P Hub',
        // Список актуальних ендпоінтів/дзеркал для ротації
        nodes: [
            'https://jac.red',
            'https://jacred.xyz'
        ],
        timeout: 4000
    }

    function withTimeout(ms) {
        let controller = new AbortController()
        let timeoutId = setTimeout(() => controller.abort(), ms)

        return {
            signal: controller.signal,
            done: () => clearTimeout(timeoutId)
        }
    }

    function toBase(url) {
        if (!url) return ''

        url = String(url).trim()
        if (!/^https?:\/\//i.test(url)) url = 'http://' + url

        return url.replace(/\/+$/, '')
    }

    function uniq(list) {
        return list.filter((v, i) => v && list.indexOf(v) === i)
    }

    class JacRedProvider {
        constructor() {
            this.activeNodeIndex = 0
        }

        // Alternative queries: the first one is the same as before, the rest widen the net
        buildQueries(movie) {
            let title = movie.title || movie.name || ''
            let original = movie.original_title || movie.original_name || ''
            let year = ((movie.release_date || movie.first_air_date || '') + '').slice(0, 4)

            return uniq([
                title,
                original,
                year ? `${title} ${year}` : '',
                movie.imdb_id || ''
            ]).filter(q => q.trim().length)
        }

        async request(node, query) {
            let t = withTimeout(CONFIG.timeout)
            let url = `${node}/api/v1/search?query=${encodeURIComponent(query)}`

            try {
                let response = await fetch(url, {
                    signal: t.signal,
                    headers: { 'Accept': 'application/json' }
                })

                if (!response.ok) throw new Error(`HTTP ${response.status}`)

                return await response.json()
            } finally {
                t.done()
            }
        }

        // Returns normalized items. Throws only when no node answered at all.
        async search(movie) {
            let queries = this.buildQueries(movie)
            let lastError = null
            let anyNodeOk = false

            for (let query of queries) {
                for (let i = 0; i < CONFIG.nodes.length; i++) {
                    let idx = (this.activeNodeIndex + i) % CONFIG.nodes.length
                    let node = CONFIG.nodes[idx]

                    try {
                        let data = await this.request(node, query)

                        anyNodeOk = true
                        this.activeNodeIndex = idx

                        let items = this.normalize(data)
                        if (items.length) return items

                        break // node answered, nothing for this query → next query
                    } catch (err) {
                        lastError = err
                        console.warn(`[JacHub] Node failed: ${node}. Rotating...`)
                    }
                }
            }

            if (!anyNodeOk) throw new Error(`[JacHub] All nodes failed: ${lastError?.message}`)

            return []
        }

        // Backup source: TorrServer's own search, if the user has a TorrServer configured
        async searchTorrServer(movie) {
            let base = toBase(Lampa.Storage.get('torrserver_url') || Lampa.Storage.get('torrserver_url_two'))
            if (!base) return []

            let query = movie.title || movie.name || movie.original_title || movie.original_name || ''
            let t = withTimeout(CONFIG.timeout * 2)

            try {
                let response = await fetch(`${base}/search/?query=${encodeURIComponent(query)}`, {
                    signal: t.signal,
                    headers: { 'Accept': 'application/json' }
                })

                if (!response.ok) return []

                let data = await response.json()
                if (!Array.isArray(data)) return []

                return this.normalize(data.map(e => ({
                    title: e.Title,
                    size: e.Size,
                    seeders: parseInt(e.Seed) || 0,
                    leechers: parseInt(e.Peer) || 0,
                    magnetUrl: e.Magnet,
                    indexer: e.Tracker
                })))
            } catch (err) {
                console.warn('[JacHub] TorrServer search failed', err)
                return []
            } finally {
                t.done()
            }
        }

        // Full chain: JacRed → TorrServer. Resolves to [] when everything is empty.
        async searchWithFallback(movie) {
            let jacredError = null
            let items = []

            try {
                items = await this.search(movie)
            } catch (err) {
                jacredError = err
            }

            if (items.length) return { items, source: 'jacred' }

            items = await this.searchTorrServer(movie)
            if (items.length) return { items, source: 'torrserver' }

            if (jacredError) console.error('[JacHub]', jacredError)

            return { items: [], source: null }
        }

        normalize(items) {
            if (!Array.isArray(items)) return []

            return items
                .filter(item => item && (item.magnetUrl || item.downloadUrl))
                .map(item => ({
                    title: item.title || 'Unknown Release',
                    size: item.info?.sizeName || (item.size ? (item.size / 1073741824).toFixed(2) + ' GB' : 'N/A'),
                    seeds: item.seeders || 0,
                    peers: item.leechers || 0,
                    magnet: item.magnetUrl || item.downloadUrl,
                    tracker: item.indexer || 'P2P',
                    quality: this.getQualityText(item)
                }))
        }

        getQualityText(item) {
            if (item.info?.quality) return `${item.info.quality}p`

            let title = (item.title || '').toLowerCase()
            if (/2160p|4k|uhd/.test(title)) return '4K UHD'
            if (/1080p|fhd|remux/.test(title)) return '1080p FHD'
            if (/720p|hd/.test(title)) return '720p HD'
            return 'SD'
        }
    }

    function registerPlugin() {
        let provider = new JacRedProvider()

        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                let buttons = e.render.find('.full-start__buttons')
                if (!buttons.length) return

                let btn = $(`
                    <div class="button selector" data-action="jacred_watch">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Дивитися (P2P)</span>
                    </div>
                `)

                btn.on('hover:enter', () => startSearch(provider, e.data.movie))

                buttons.append(btn)
            }
        })
    }

    async function startSearch(provider, movie) {
        Lampa.Noty.show('Шукаємо торренти через JacRed...')

        let result = await provider.searchWithFallback(movie)

        if (result.items.length) {
            if (result.source === 'torrserver') Lampa.Noty.show('JacRed порожній, знайдено через TorrServer')
            openModal(result.items, movie, provider)
        } else {
            openFallbackModal(provider, movie)
        }
    }

    function openModal(items, movie, provider) {
        let list = items.map(item => ({
            title: `${item.quality} | S: ${item.seeds} | ${item.size}`,
            subtitle: `${item.tracker} — ${item.title}`,
            action: () => {
                if (!item.magnet) {
                    Lampa.Noty.show('Помилка: магніт-посилання відсутнє')
                    return
                }
                // Передача на TorrCluster або вбудований плеєр торрентів Lampa
                if (window.TorrCluster && typeof window.TorrCluster.stream === 'function') {
                    window.TorrCluster.stream(item.magnet, movie)
                } else if (Lampa.Torrserver && typeof Lampa.Torrserver.stream === 'function') {
                    Lampa.Torrserver.stream(item.magnet, movie)
                } else if (Lampa.Torrent && typeof Lampa.Torrent.start === 'function') {
                    Lampa.Torrent.start({
                        title: item.title,
                        MagnetUri: item.magnet,
                        Link: item.magnet
                    }, movie)
                } else {
                    Lampa.Noty.show('Помилка: плеєр торрентів недоступний')
                }
            }
        }))

        Lampa.Select.show({
            title: 'Виберіть реліз (JacRed)',
            items: list,
            onSelect: (item) => item.action()
        })
    }

    // Shown when every source came back empty: retry, or hand off to Lampa's own torrents list
    function openFallbackModal(provider, movie) {
        let title = movie.title || movie.name || movie.original_title || movie.original_name || ''

        Lampa.Noty.show('Немає джерел для перегляду')

        Lampa.Select.show({
            title: 'Джерела не знайдено',
            items: [
                {
                    title: 'Повторити пошук',
                    action: () => startSearch(provider, movie)
                },
                {
                    title: 'Шукати в торрентах Lampa',
                    action: () => {
                        Lampa.Activity.push({
                            url: '',
                            title: 'Торренти',
                            component: 'torrents',
                            search: title,
                            from_search: true,
                            page: 1
                        })
                    }
                }
            ],
            onSelect: (item) => item.action()
        })
    }

    if (window.Lampa) {
        registerPlugin()
    } else {
        document.addEventListener('appready', registerPlugin)
    }
})()
