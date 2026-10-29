(function () {
    'use strict'

    /**
     * Advanced TorrServer Matrix Cluster & Health Checker for HookTV / Lampa
     * Includes 10+ Public, Community, and Proxy Nodes with Low-Latency Parallel Health-Checks (Promise.any)
     */

    const TORR_CLUSTER = [
        // 1. Локальні ноди (Пріоритет для домашньої мережі / LAN)
        'http://192.168.1.10:8090',      // Home NAS / Server
        'http://127.0.0.1:8090',         // Local Android TV / PC

        // 2. Публічні та спільнотні ноди Lampa / TorrServer
        'http://ts.lampa.mx:8090',       // Lampa MX Node 1
        'http://torr.yt:8090',           // Community Node 2
        'http://89.108.81.70:8090',      // Backup IP Node 3
        'http://45.142.122.100:8090',    // Backup IP Node 4
        'http://185.209.22.15:8090',     // Backup IP Node 5

        // 3. Додаткові резервні та проксі-вузли спільноти
        'http://ts2.lampa.mx:8090',      // Lampa MX Secondary
        'http://torrserver.online:8090', // Public Community Web
        'http://91.240.86.11:8090',      // Mirror Node 8
        'http://193.124.118.45:8090',    // Mirror Node 9
        'http://109.248.203.20:8090'     // Mirror Node 10
    ]

    const HEALTH_CHECK_TIMEOUT = 2000 // 2 секунди на відгук

    function normalizeUrl(url) {
        if (!url) return ''
        url = String(url).trim()
        if (!/^https?:\/\//i.test(url)) url = 'http://' + url
        return url.replace(/\/+$/, '')
    }

    // Збираємо список нод: спочатку власні збережені адреси користувача, потім пул кластера
    function getNodePool(customList) {
        let pool = []

        if (Array.isArray(customList) && customList.length) {
            pool = customList.map(normalizeUrl).filter(Boolean)
        } else {
            if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Storage) {
                let savedOne = normalizeUrl(window.Lampa.Storage.get('torrserver_url'))
                let savedTwo = normalizeUrl(window.Lampa.Storage.get('torrserver_url_two'))
                if (savedOne) pool.push(savedOne)
                if (savedTwo && savedTwo !== savedOne) pool.push(savedTwo)
            }
            let clusterNodes = (typeof window !== 'undefined' && window.TorrCluster && Array.isArray(window.TorrCluster.nodes))
                ? window.TorrCluster.nodes
                : TORR_CLUSTER

            pool = pool.concat(clusterNodes.map(normalizeUrl))
        }

        // Прибираємо дублікати
        return pool.filter((v, i, a) => v && a.indexOf(v) === i)
    }

    // Паралельний перевіряльник за принципом "Fastest Healthy First"
    async function findFastestAliveNode(customPool) {
        const pool = getNodePool(customPool)
        if (!pool.length) {
            throw new Error('Список нод TorrServer порожній!')
        }

        const pingPromises = pool.map(async (node) => {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT)
            const startTime = performance.now()

            try {
                // Пінгуємо endpoint /echo
                const response = await fetch(`${node}/echo`, {
                    method: 'GET',
                    signal: controller.signal
                })

                // TorrServer повертає статус 200 OK (або 401 Unauthorized якщо захищено паролем)
                if (response.ok || response.status === 401) {
                    const latency = Math.round(performance.now() - startTime)
                    console.log(`[TorrCluster] Node alive: ${node} (${latency}ms)`)
                    return { node, latency }
                }
            } catch (err) {
                // Нода недоступна, відвалилася по таймауту або CORS/Mixed Content
            } finally {
                clearTimeout(timeoutId)
            }

            throw new Error(`Node down: ${node}`)
        })

        try {
            // Promise.any повертає ПЕРШУ ноду, яка успішно пройшла перевірку
            const winner = await Promise.any(pingPromises)
            console.log(`[TorrCluster] Winner selected: ${winner.node} with ${winner.latency}ms ping`)
            return winner.node
        } catch (aggregateError) {
            throw new Error('Усі ноди TorrCluster недоступні. Перевірте мережеве з’єднання або локальний TorrServer!')
        }
    }

    // Запуск відтворення через нативний плеєр торрентів Lampa
    function playTorrentStream(magnet, movie) {
        if (typeof window === 'undefined' || !window.Lampa) {
            console.error('[TorrCluster] Lampa API не знайдено')
            return
        }

        const magnetUri = typeof magnet === 'string'
            ? magnet
            : (magnet.magnet || magnet.MagnetUri || magnet.Link || magnet.link || '')

        const title = (typeof magnet === 'object' && magnet.title)
            || (movie && (movie.title || movie.name))
            || 'Торрент'

        const poster = (movie && (movie.img || movie.poster_path)) || ''

        if (window.Lampa.Torrent && typeof window.Lampa.Torrent.start === 'function') {
            window.Lampa.Torrent.start({
                title: title,
                MagnetUri: magnetUri,
                Link: magnetUri,
                poster: poster
            }, movie || {})
        } else {
            console.error('[TorrCluster] Lampa.Torrent.start не знайдено')
        }
    }

    // Інтегрована функція запуску стріму з ротацією та failover
    async function streamWithClusterFailover(magnet, movie) {
        if (!magnet) {
            if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Noty) {
                window.Lampa.Noty.show('Помилка: магніт-посилання відсутнє')
            }
            return
        }

        if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Noty) {
            window.Lampa.Noty.show('Шукаємо найшвидший TorrServer серед 10+ нод...')
        }

        try {
            const activeNode = await findFastestAliveNode()

            // Динамічно оновлюємо основний хост TorrServer у конфігу Lampa
            if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Storage) {
                window.Lampa.Storage.set('torrserver_url', activeNode)
                window.Lampa.Storage.set('torrserver_use_link', 'one')
            }

            if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Noty) {
                window.Lampa.Noty.show(`Підключено до: ${activeNode}`)
            }

            // Передаємо потік у нативний плеєр Lampa
            playTorrentStream(magnet, movie)

        } catch (err) {
            if (typeof window !== 'undefined' && window.Lampa && window.Lampa.Noty) {
                window.Lampa.Noty.show(err.message || 'Помилка кластера TorrServer!')
            }
            console.error('[TorrCluster Error]', err)
        }
    }

    // Реєстрація та експорт
    function register() {
        if (typeof window === 'undefined') return

        window.TorrCluster = {
            nodes: TORR_CLUSTER,
            findNode: findFastestAliveNode,
            stream: streamWithClusterFailover
        }

        // Сумісність для плагінів (наприклад jacred_hub), які очікують Lampa.Torrserver.stream
        if (window.Lampa) {
            if (!window.Lampa.Torrserver) {
                window.Lampa.Torrserver = window.Lampa.Torserver || {}
            }
            window.Lampa.Torrserver.stream = streamWithClusterFailover
        }
    }

    if (typeof window !== 'undefined') {
        if (window.Lampa) {
            register()
        } else {
            document.addEventListener('appready', register)
        }
    }
})()
