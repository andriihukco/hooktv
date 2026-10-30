import Reguest from '../utils/reguest'
import Storage from '../core/storage/storage'
import Lang from '../core/lang'
import Utils from '../utils/utils'
import Arrays from '../utils/arrays'
import Activity from '../interaction/activity/activity'
import Controller from '../core/controller'
import Component from '../core/component'
import Template from '../interaction/template'
import Scroll from '../interaction/scroll'
import Explorer from '../interaction/explorer'
import Filter from '../interaction/filter'
import Player from '../interaction/player'
import Background from '../interaction/background'
import Timeline from '../interaction/timeline'
import Bell from '../interaction/bell'
import Select from '../interaction/select'
import Noty from '../interaction/noty'
import Modal from '../interaction/modal'
import Platform from '../core/platform'
import SettingsApi from '../interaction/settings/settings'
import Manifest from '../core/manifest'
import TMDB from '../core/tmdb/tmdb'
import Loading from '../interaction/loading'
import Input from '../interaction/settings/input'
import Dub from '../utils/dub'
import Watch from '../interaction/watch'
import Archive from './archive'

/**
 * HOOK TV Inbuilt Online Balancers Service
 * Connects to verified online balancers (Filmix, UaFlix, UaTut, BambooUA, AnimeOn, MoonAnime, etc.)
 */

var config = {
    api_base: 'https://bbe.lme.isroot.in/api/v2',
    storage_prefixes: {
        last_balanser: 'hook_online_last_balanser',
        balanser: 'hook_online_balanser',
        watched_last: 'online_watched_last',
        view: 'online_view'
    }
}

var AUTH_KEYS = {
    filmixToken: 'HOOK_FILMIX_TOKEN',
    filmixDeviceId: 'HOOK_FILMIX_DEVICE_ID',
    filmixMaxQuality: 'HOOK_FILMIX_MAX_QUALITY'
}

var DISABLED_SOURCE_CODES = {
    NOT_FOUND: true,
    CONTENT_REMOVED: true,
    UNAUTHORIZED: true,
    INVALID_AUTH: true,
    MISSING_IMDB_OR_TMDB: true,
    INVALID_TMDB_ID: true,
    INVALID_SERIAL: true,
    NO_PLAYER_DATA: true,
    NO_STREAM_DATA: true,
    NO_STREAMS: true,
    NO_STREAM: true,
    NO_MOVIE_STREAM: true,
    NO_MOVIE_STREAMS: true,
    NO_EPISODES: true,
    NO_VOICES: true,
    NO_SERIAL_STRUCTURE: true,
    NO_ANIME_INFO: true,
    NO_ANIME_STRUCTURE: true,
    VOICE_NOT_FOUND: true
}

function normalize(value) {
    return (value || '').toString().trim()
}

function readAuth(key, fallbackKey) {
    var val = normalize(Storage.get(key, ''))
    if (!val && fallbackKey) val = normalize(Storage.get(fallbackKey, ''))
    return val
}

function writeAuth(key, value) {
    Storage.set(key, normalize(value))
}

function getFilmixToken() {
    return readAuth(AUTH_KEYS.filmixToken, 'BO_FILMIX_TOKEN')
}

function setFilmixToken(value) {
    writeAuth(AUTH_KEYS.filmixToken, value)
}

function getFilmixDeviceId() {
    return readAuth(AUTH_KEYS.filmixDeviceId, 'BO_FILMIX_DEVICE_ID')
}

function setFilmixDeviceId(value) {
    writeAuth(AUTH_KEYS.filmixDeviceId, value)
}

function ensureFilmixDeviceId() {
    var deviceId = getFilmixDeviceId()
    if (!deviceId) {
        deviceId = Utils.uid(16)
        setFilmixDeviceId(deviceId)
    }
    return deviceId
}

function normalizeErrorCode(json) {
    return json && (json.error_code || (json.meta && json.meta.code)) || ''
}

function extractErrorText(json) {
    return json && (json.error || json.message || json.error_code) || ''
}

function isInnerPlayer() {
    var player = Storage.field ? Storage.field('player') : Storage.get('player')
    if (player) return player === 'inner'
    if (Platform && Platform.is('android')) return false
    return true
}

var APIClient = function() {
    function APIClient() {
        this.network = new Reguest()
    }
    APIClient.prototype.apiBase = function() {
        return config.api_base
    }
    APIClient.prototype.getAuth = function() {
        var token = getFilmixToken()
        var deviceId = getFilmixDeviceId()
        if (token && !deviceId) {
            deviceId = ensureFilmixDeviceId()
        }
        return {
            filmix_token: token,
            filmix_device_id: deviceId
        }
    }
    APIClient.prototype.addParam = function(url, key, value) {
        if (!value) return url
        return Utils.addUrlComponent(url, key + '=' + encodeURIComponent(value))
    }
    APIClient.prototype.postJson = function(url, data, success, fail) {
        this.network.silent(url, success, fail, JSON.stringify(data), {
            dataType: 'json',
            headers: {
                'Content-Type': 'application/json'
            }
        })
    }
    APIClient.prototype.getJson = function(url, success, fail) {
        this.network.silent(url, success, fail)
    }
    APIClient.prototype.clear = function() {
        this.network.clear()
    }
    APIClient.prototype.getSources = function(success, fail) {
        this.getJson(this.apiBase() + '/sources', success, fail)
    }
    APIClient.prototype.search = function(params, sources, success, fail) {
        var url = this.apiBase() + '/search'
        var sourceKey = Array.isArray(sources) ? sources.join(',') : sources
        url = this.addParam(url, 'sources', sourceKey)
        url = this.addParam(url, 'source', sourceKey)
        for (var key in params) {
            url = this.addParam(url, key, params[key])
        }
        var auth = this.getAuth()
        if (sources === 'filmix' || (Array.isArray(sources) && sources.indexOf('filmix') !== -1)) {
            url = this.addParam(url, 'filmix_token', auth.filmix_token)
            url = this.addParam(url, 'filmix_device_id', auth.filmix_device_id)
        }
        this.getJson(url, success, fail)
    }
    APIClient.prototype.getContent = function(sourceKey, ref, success, fail) {
        var url = this.apiBase() + '/content'
        var data = {
            source: sourceKey,
            ref: this.extendRefWithAuth(sourceKey, ref),
            full: true
        }
        this.postJson(url, data, success, fail)
    }
    APIClient.prototype.getStream = function(sourceKey, ref, success, fail) {
        var url = this.apiBase() + '/stream'
        var data = {
            source: sourceKey,
            ref: this.extendRefWithAuth(sourceKey, ref)
        }
        this.postJson(url, data, success, fail)
    }
    APIClient.prototype.extendRefWithAuth = function(sourceKey, ref) {
        if (!ref || typeof ref !== 'object') return ref
        var auth = this.getAuth()
        var next = {}
        Arrays.extend(next, ref, true)
        if (sourceKey === 'filmix') {
            if (!next.token && auth.filmix_token) next.token = auth.filmix_token
            if (!next.device_id && auth.filmix_device_id) next.device_id = auth.filmix_device_id
        }
        return next
    }
    return APIClient
}()

var SourcesStore = function() {
    function SourcesStore() {
        this.sources_key = 'HOOK_ONLINE_SOURCES'
        this.sources_sort_key = 'HOOK_ONLINE_SOURCES_SORT'
        this.sources_hide_key = 'HOOK_ONLINE_SOURCES_HIDE'
        
        var legacySources = Storage.get(this.sources_key, null) || Storage.get('BO_SOURCES', [])
        this.available_sources = Array.isArray(legacySources) ? legacySources : []
        this.titles = {}
        this.applyTitles(this.available_sources)
    }
    SourcesStore.prototype.normalizeName = function(name) {
        return (name || '').toString().trim().toLowerCase()
    }
    SourcesStore.prototype.applyTitles = function(list) {
        var _this = this
        if (!Array.isArray(list)) return
        list.forEach(function(item) {
            if (!item) return
            var key = _this.normalizeName(item.key || item.name)
            var title = item.display_name || item.displayName || item.display || item.title || item.label || item.name || ''
            if (key && title) _this.titles[key] = title
        })
    }
    SourcesStore.prototype.getSorted = function() {
        var sorted = Storage.get(this.sources_sort_key, null) || Storage.get('BO_SOURCES_SORT', [])
        return Array.isArray(sorted) ? sorted.map(this.normalizeName).filter(Boolean) : []
    }
    SourcesStore.prototype.getHidden = function() {
        var hidden = Storage.get(this.sources_hide_key, null) || Storage.get('BO_SOURCES_HIDE', [])
        return Array.isArray(hidden) ? hidden.map(this.normalizeName).filter(Boolean) : []
    }
    SourcesStore.prototype.saveAvailable = function(list) {
        this.available_sources = list
        this.applyTitles(list)
        Storage.set(this.sources_key, list)
    }
    SourcesStore.prototype.saveSorted = function(list) {
        Storage.set(this.sources_sort_key, list)
    }
    SourcesStore.prototype.saveHidden = function(list) {
        Storage.set(this.sources_hide_key, list)
    }
    SourcesStore.prototype.getEnabledKeys = function() {
        var _this = this
        return this.available_sources.filter(function(item) {
            return item && item.enabled !== false
        }).map(function(item) {
            return _this.normalizeName(item.key || item.name)
        }).filter(Boolean)
    }
    SourcesStore.prototype.applyUserFilters = function(list) {
        var hidden = this.getHidden()
        var sorted = this.getSorted()
        var result = list.slice(0)
        if (sorted.length) {
            var ordered = []
            sorted.forEach(function(key) {
                if (result.indexOf(key) !== -1) ordered.push(key)
            })
            result.forEach(function(key) {
                if (ordered.indexOf(key) === -1) ordered.push(key)
            })
            result = ordered
        }
        if (hidden.length) {
            result = result.filter(function(name) {
                return hidden.indexOf(name) === -1
            })
        }
        return result
    }
    SourcesStore.prototype.getTitle = function(key) {
        return this.titles[this.normalizeName(key)] || key
    }
    return SourcesStore
}()

var sourcesStore = new SourcesStore()

function getFileId(movie) {
    if (!movie) return ''
    var title = movie.number_of_seasons ? (movie.original_name || movie.name || movie.title) : (movie.original_title || movie.title || movie.name)
    var id = movie.tmdb_id || movie.id
    var key = title || (id ? 'id:' + id : '') || ''
    return Utils.hash(key)
}

function getHashTimeline(movie, season, episode) {
    var title = movie.original_title || movie.original_name || movie.name || movie.title || ''
    return Utils.hash(season ? [season, episode, title].join('') : title)
}

function getHashBehold(movie, season, episode, voice_name) {
    var title = movie.original_title || movie.original_name || movie.name || movie.title || ''
    var vn = voice_name || ''
    return Utils.hash(season ? [season, episode, title, vn].join('') : title + vn)
}

function createV2(sourceKey) {
    return function v2(comp, _object) {
        var api_client = comp.api_client
        var object = _object
        var selected = null
        var series = null
        var episodes_cache = {}
        var stream_cache = {}
        var content_ref = null
        var lazy_state = createLazyState()
        var filter_items = { season: [], voice: [] }
        var choice = { season: 0, voice: 0, voice_name: '' }

        this.searchByTitle = function(_obj, title) {
            object = _obj
            search({ title: title })
        }
        this.searchByImdbID = function(_obj, imdb_id) {
            object = _obj
            search({ imdb_id: imdb_id })
        }
        this.searchByKinopoisk = function(_obj, kinopoisk_id) {
            object = _obj
            search({ kinopoisk_id: kinopoisk_id })
        }
        this.searchByMalId = function(_obj, mal_id) {
            object = _obj
            search({ mal_id: mal_id })
        }
        this.search = function(_obj, data) {
            object = _obj
            if (!data || !data.length) return comp.doesNotAnswer()
            var first = data[0] || {}
            if (first.ref) {
                selected = first
                loadContent(first.ref)
                return
            }
            search({
                title: first.title || first.name || object.movie.title || object.movie.name,
                original_title: first.orig_title || first.original_title || first.nameEn || object.movie.original_title || object.movie.original_name,
                imdb_id: first.imdb_id,
                tmdb_id: first.tmdb_id,
                kinopoisk_id: first.kp_id || first.kinopoisk_id || first.filmId,
                mal_id: first.mal_id || first.malId || object.movie.mal_id,
                year: getYear(object.movie || {}),
                serial: typeof first.serial !== 'undefined' ? first.serial : getSerial(object.movie || {})
            })
        }
        this.extendChoice = function(saved) {
            Arrays.extend(choice, saved, true)
        }
        this.reset = function() {
            comp.reset()
            choice = { season: 0, voice: 0, voice_name: '' }
            filter()
            buildEpisodes()
        }
        this.filter = function(type, a, b) {
            choice[a.stype] = b.index
            if (a.stype === 'voice' && filter_items.voice[b.index]) {
                choice.voice_name = filter_items.voice[b.index]
            }
            comp.reset()
            filter()
            buildEpisodes()
        }
        this.cancel = function() {
            api_client.clear()
        }
        this.destroy = function() {
            api_client.clear()
            selected = null
            series = null
            episodes_cache = {}
            content_ref = null
            lazy_state = createLazyState()
        }

        function handleSourceError(json) {
            var code = normalizeErrorCode(json)
            var text = extractErrorText(json) || code
            if (code && DISABLED_SOURCE_CODES[code]) {
                comp.disableSource(sourceKey, code)
                comp.empty()
                return
            }
            if (text) comp.pushError(text)
            comp.empty()
        }

        function handleStreamError(json) {
            var code = normalizeErrorCode(json)
            var text = extractErrorText(json)
            if (code && DISABLED_SOURCE_CODES[code]) {
                comp.disableSource(sourceKey, code)
            }
            if (text) comp.pushError(text)
        }

        function getYear(movie) {
            var date = movie.release_date || movie.first_air_date || movie.year || movie.start_date
            return date ? (date + '').slice(0, 4) : ''
        }

        function getTmdbId(movie) {
            if (!movie) return ''
            if (movie.tmdb_id) return movie.tmdb_id
            if (typeof movie.id === 'number' || (typeof movie.id === 'string' && /^\d+$/.test(movie.id))) return movie.id
            return ''
        }

        function getSerial(movie) {
            if (!movie) return ''
            return movie.name ? 1 : 0
        }

        function normalizeVoiceName(voice) {
            return voice.display_name || voice.displayName || voice.name || voice.id || ''
        }

        function getSeasonNumber(value, fallback) {
            if (typeof value === 'number') return value
            var match = String(value || '').match(/(\d+)/)
            if (match) {
                var parsed = parseInt(match[1], 10)
                if (!isNaN(parsed)) return parsed
            }
            return fallback
        }

        function createLazyState() {
            return {
                enabled: false,
                season_numbers: [],
                loaded: {},
                pending: {}
            }
        }

        function isSeriesObject() {
            return !!(object && object.movie && object.movie.name)
        }

        function isLazySeriesMode() {
            return (sourceKey === 'uaflix' || sourceKey === 'aycw') && isSeriesObject()
        }

        function toPositiveInt(value) {
            var parsed = parseInt(value, 10)
            return isNaN(parsed) || parsed < 1 ? 0 : parsed
        }

        function cloneRef(ref) {
            var next = {}
            if (ref && typeof ref === 'object') Arrays.extend(next, ref, true)
            return next
        }

        function sortSeasonNumbers(values) {
            var map = {};
            (values || []).forEach(function(value) {
                var number = toPositiveInt(value)
                if (number) map[number] = true
            })
            return Object.keys(map).map(function(value) {
                return parseInt(value, 10)
            }).sort(function(a, b) {
                return a - b
            })
        }

        function getRefSeasonNumber(ref) {
            return toPositiveInt(ref && ref.season)
        }

        function getTmdbSeasonNumbers() {
            var count = toPositiveInt(object && object.movie && object.movie.number_of_seasons)
            var seasons = []
            for (var i = 1; i <= count; i++) {
                seasons.push(i)
            }
            return seasons
        }

        function collectVoiceSeasonNumbers(voice) {
            var seasons = getVoiceSeasons(voice)
            return sortSeasonNumbers(seasons.map(function(season, index) {
                return getSeasonNumber(season.title || season.season || season.number, index + 1)
            }))
        }

        function collectSeriesSeasonNumbers() {
            if (!series || !Array.isArray(series.voices)) return []
            var seasons = []
            series.voices.forEach(function(voice) {
                seasons = seasons.concat(collectVoiceSeasonNumbers(voice))
            })
            return sortSeasonNumbers(seasons)
        }

        function ensureLazySeasonNumbers(values) {
            lazy_state.season_numbers = sortSeasonNumbers((lazy_state.season_numbers || []).concat(values || []))
        }

        function markLazySeasonLoaded(values) {
            (values || []).forEach(function(value) {
                var number = toPositiveInt(value)
                if (number) lazy_state.loaded[number] = true
            })
        }

        function getSeasonNumbersForFilter(voice) {
            if (lazy_state.enabled && lazy_state.season_numbers.length) return lazy_state.season_numbers.slice(0)
            return collectVoiceSeasonNumbers(voice)
        }

        function getSeasonData(voice, season_number) {
            var seasons = getVoiceSeasons(voice)
            for (var i = 0; i < seasons.length; i++) {
                var season = seasons[i]
                var number = getSeasonNumber(season.title || season.season || season.number, i + 1)
                if (number === season_number) return season
            }
            return null
        }

        function getSeasonEpisodes(voice, season_number) {
            var season = getSeasonData(voice, season_number)
            if (!season) return []
            return Array.isArray(season.episodes) ? season.episodes : []
        }

        function findVoiceWithSeasonEpisodes(season_number) {
            if (!series || !Array.isArray(series.voices)) return -1
            for (var i = 0; i < series.voices.length; i++) {
                if (getSeasonEpisodes(series.voices[i], season_number).length) return i
            }
            return -1
        }

        function mergeSeriesSeasonData(next_series) {
            if (!next_series || !Array.isArray(next_series.voices)) return
            if (!series || !Array.isArray(series.voices)) {
                series = next_series
                return
            }
            next_series.voices.forEach(function(next_voice) {
                if (!next_voice) return
                var voice = series.voices.find(function(item) {
                    return item.id === next_voice.id
                })
                if (!voice) {
                    series.voices.push(next_voice)
                    return
                }
                if (next_voice.display_name) voice.display_name = next_voice.display_name
                var by_number = {}
                getVoiceSeasons(voice).forEach(function(season, index) {
                    var number = getSeasonNumber(season.title || season.season || season.number, index + 1)
                    if (number) by_number[number] = season
                })
                getVoiceSeasons(next_voice).forEach(function(season, index) {
                    var number = getSeasonNumber(season.title || season.season || season.number, index + 1)
                    if (number) by_number[number] = season
                })
                voice.seasons = Object.keys(by_number).map(function(value) {
                    return parseInt(value, 10)
                }).sort(function(a, b) {
                    return a - b
                }).map(function(number) {
                    return by_number[number]
                })
            })
        }

        function buildInitialLazySeasonNumbers(ref) {
            var seasons = getTmdbSeasonNumbers()
            var ref_season = getRefSeasonNumber(ref)
            if (ref_season) seasons.push(ref_season)
            return sortSeasonNumbers(seasons)
        }

        function initializeLazyState(ref) {
            lazy_state = createLazyState()
            if (!isLazySeriesMode()) return
            lazy_state.enabled = true
            var loaded_seasons = collectSeriesSeasonNumbers()
            var initial_seasons = buildInitialLazySeasonNumbers(ref)
            ensureLazySeasonNumbers(initial_seasons)
            ensureLazySeasonNumbers(loaded_seasons)
            if (series && Array.isArray(series.seasons)) ensureLazySeasonNumbers(series.seasons)
            markLazySeasonLoaded(loaded_seasons)
            if (!lazy_state.season_numbers.length) {
                var fallback = getRefSeasonNumber(ref)
                if (fallback) ensureLazySeasonNumbers([fallback])
            }
        }

        function loadLazySeason(season_number, done, fail) {
            if (!lazy_state.enabled || !season_number || !content_ref) {
                if (fail) fail()
                return
            }
            if (lazy_state.loaded[season_number]) {
                if (done) done()
                return
            }
            if (lazy_state.pending[season_number]) return
            lazy_state.pending[season_number] = true
            comp.loading(true)
            var ref = cloneRef(content_ref)
            ref.season = season_number
            api_client.getContent(sourceKey, ref, function(json) {
                delete lazy_state.pending[season_number]
                if (!json || !json.ok || json.type !== 'series') {
                    comp.loading(false)
                    handleSourceError(json)
                    if (fail) fail(extractErrorText(json))
                    return
                }
                var next_series = normalizeSeries(json)
                mergeSeriesSeasonData(next_series)
                var loaded_seasons = collectSeriesSeasonNumbers()
                markLazySeasonLoaded(loaded_seasons)
                markLazySeasonLoaded([season_number])
                ensureLazySeasonNumbers(loaded_seasons)
                ensureLazySeasonNumbers([season_number])
                if (done) done()
            }, function() {
                delete lazy_state.pending[season_number]
                comp.loading(false)
                if (fail) fail()
            })
        }

        function normalizeEpisodeTitle(episode, number) {
            return episode.title || episode.name || (Lang.translate('torrent_serial_episode') + ' ' + number)
        }

        function search(params) {
            params = params || {}
            var movie = (object && object.movie) || object || {}
            if (!params.title) params.title = movie.title || movie.name || ''
            if (!params.original_title) params.original_title = movie.original_title || movie.original_name || ''
            if (!params.year) params.year = getYear(movie)
            if (!params.imdb_id) params.imdb_id = movie.imdb_id || ''
            if (!params.tmdb_id) params.tmdb_id = getTmdbId(movie)
            if (!params.kinopoisk_id) params.kinopoisk_id = movie.kinopoisk_id || ''
            if (!params.mal_id) params.mal_id = movie.mal_id || ''
            if (typeof params.serial === 'undefined') params.serial = getSerial(movie)

            comp.loading(true)
            api_client.search(params, sourceKey, function(json) {
                if (!json || !json.ok) {
                    handleSourceError(json)
                    return
                }
                if (json.meta && json.meta.code === 'NO_RESULTS') {
                    comp.empty()
                    return
                }
                var items = json.items || []
                if (!items.length) {
                    comp.empty()
                    return
                }
                var aggregated_moonanime = sourceKey === 'moonanime' ? items.find(function(item) {
                    return item && item.ref && Array.isArray(item.ref.seasons) && item.ref.seasons.length
                }) : null

                if (aggregated_moonanime && !object.clarification) {
                    selected = aggregated_moonanime
                    loadContent(aggregated_moonanime.ref)
                    return
                }
                if (items.length > 1 && !object.clarification) {
                    comp.similars(items.map(function(item) {
                        return {
                            id: item.ref && (item.ref.id || item.ref.href || item.ref.url || item.ref.play) || item.title,
                            title: item.title || item.name,
                            orig_title: item.title_en || item.original_title,
                            year: item.year,
                            imdb_id: item.imdb_id,
                            tmdb_id: item.tmdb_id,
                            kinopoisk_id: item.kinopoisk_id,
                            mal_id: item.mal_id,
                            serial: item.serial,
                            source: item.source || sourceKey,
                            poster: sourceKey === 'uaflix' ? item.poster : '',
                            ref: item.ref
                        }
                    }))
                    comp.loading(false)
                    return
                }
                selected = items[0]
                loadContent(selected.ref)
            }, function() {
                comp.doesNotAnswer()
            })
        }

        function loadContent(ref) {
            var request_ref = cloneRef(ref)
            content_ref = cloneRef(ref)
            if (sourceKey === 'aycw' && typeof request_ref.season !== 'undefined') {
                request_ref.season = Number(request_ref.season)
            }
            if (isLazySeriesMode()) {
                delete content_ref.season
                var season_numbers = buildInitialLazySeasonNumbers(ref)
                var ref_season = getRefSeasonNumber(ref)
                var season_number = ref_season
                if (!season_number) {
                    if (choice.season >= season_numbers.length) choice.season = 0
                    season_number = season_numbers[choice.season] || season_numbers[0] || 1
                } else {
                    var index = season_numbers.indexOf(ref_season)
                    if (index !== -1) choice.season = index
                }
                request_ref = cloneRef(content_ref)
                request_ref.season = season_number
            }
            api_client.getContent(sourceKey, request_ref, function(json) {
                if (!json || !json.ok) {
                    handleSourceError(json)
                    return
                }
                if (json.type === 'series') {
                    series = normalizeSeries(json)
                    initializeLazyState(ref)
                    filter()
                    buildEpisodes()
                } else {
                    // autoplay has no one to notice a same-name remake, so it checks first
                    if (object.verify && !Dub.contentMatches(json, object.movie)) return comp.mismatch()
                    lazy_state = createLazyState()
                    drawMovie(json)
                }
            }, function() {
                comp.doesNotAnswer()
            })
        }

        function normalizeSeries(json) {
            var voices = Array.isArray(json.voices) ? json.voices : []
            voices = voices.map(function(voice, index) {
                var seasons = Array.isArray(voice.seasons) ? voice.seasons : []
                return {
                    id: voice.id || voice.voice_id || index,
                    display_name: normalizeVoiceName(voice) || ('Voice ' + (index + 1)),
                    seasons: seasons
                }
            })
            return {
                voices: voices,
                seasons: json.seasons
            }
        }

        function getCurrentVoice() {
            if (!series || !series.voices || !series.voices.length) return null
            return series.voices[choice.voice] || series.voices[0]
        }

        function getVoiceSeasons(voice) {
            if (!voice || !Array.isArray(voice.seasons)) return []
            return voice.seasons
        }

        function filter() {
            filter_items = { season: [], voice: [] }
            if (series && series.voices && series.voices.length) {
                filter_items.voice = series.voices.map(function(voice) {
                    return voice.display_name || voice.id
                })
            }
            if (choice.voice >= filter_items.voice.length) choice.voice = 0
            var voice = getCurrentVoice()
            var season_numbers = getSeasonNumbersForFilter(voice)
            filter_items.season = season_numbers.map(function(season_num) {
                return Lang.translate('torrent_serial_season') + ' ' + season_num
            })
            if (choice.season >= filter_items.season.length) choice.season = 0
            if (voice) choice.voice_name = voice.display_name || voice.id
            else if (filter_items.voice[choice.voice]) choice.voice_name = filter_items.voice[choice.voice]
            comp.filter(filter_items, choice)
        }

        function buildEpisodes() {
            if (!series || !series.voices || !series.voices.length) {
                comp.loading(false)
                return comp.doesNotAnswer()
            }
            var voice = getCurrentVoice()
            if (!voice) {
                comp.loading(false)
                return comp.doesNotAnswer()
            }
            var season_numbers = getSeasonNumbersForFilter(voice)
            if (!season_numbers.length) {
                comp.loading(false)
                return comp.doesNotAnswer()
            }
            var season_index = choice.season
            if (season_index >= season_numbers.length) season_index = 0
            choice.season = season_index
            var season_num = season_numbers[season_index]
            var cache_key = voice.id + ':' + season_num
            choice.voice_name = voice.display_name || voice.id
            if (episodes_cache[cache_key]) {
                renderEpisodes(episodes_cache[cache_key], season_num, voice)
                return
            }
            var episodes = getSeasonEpisodes(voice, season_num)
            if (!episodes.length && lazy_state.enabled) {
                if (!lazy_state.loaded[season_num]) {
                    loadLazySeason(season_num, function() {
                        filter()
                        buildEpisodes()
                    }, function() {
                        comp.doesNotAnswer()
                    })
                    return
                }
                var voice_index = findVoiceWithSeasonEpisodes(season_num)
                if (voice_index !== -1 && voice_index !== choice.voice) {
                    choice.voice = voice_index
                    filter()
                    buildEpisodes()
                    return
                }
            }
            if (!episodes.length) {
                comp.loading(false)
                return comp.doesNotAnswer()
            }
            episodes_cache[cache_key] = episodes
            renderEpisodes(episodes, season_num, voice)
        }

        function renderEpisodes(episodes, season, voice) {
            var items = episodes.map(function(episode, index) {
                var number = episode.number || episode.episode || (index + 1)
                return {
                    title: normalizeEpisodeTitle(episode, number),
                    season: season,
                    episode: number,
                    ref: episode.ref,
                    info: voice.display_name || voice.id,
                    voice_name: voice.display_name || voice.id,
                    voice_id: voice.id,
                    subtitles: mergeSubtitles(episode.subtitles, episode.ref && episode.ref.subtitles)
                }
            })

            comp.draw(items, {
                onEnter: function onEnter(item) {
                    getStream(item.ref, function(streams) {
                        var prepared = prepareStreams(streams)
                        var first = prepared.first
                        var qualitys = prepared.qualitys
                        var play_url = first ? first.url : ''
                        if (!first || !play_url) {
                            comp.pushError(Lang.translate('online_nolink'))
                            return
                        }

                        var isExternalPlayer = !isInnerPlayer()
                        var playlist = []
                        items.forEach(function(elem) {
                            var cell = {
                                title: elem.title,
                                timeline: elem.timeline,
                                quality: {},
                                subtitles: elem.subtitles || [],
                                mark: elem.mark,
                                season: elem.season || (elem.ref && elem.ref.season),
                                episode: elem.episode || (elem.ref && elem.ref.episode),
                                voice_name: elem.voice_name,
                                voice_id: elem.voice_id
                            }
                            if (elem === item) {
                                cell.url = play_url
                                cell.quality = qualitys
                            } else if (isExternalPlayer) {
                                cell.url = ''
                                cell._prefetch = true
                            } else {
                                cell.url = function(call) {
                                    getStream(elem.ref, function(next_streams) {
                                        var prepared_next = prepareStreams(next_streams)
                                        var next_first = prepared_next.first
                                        cell.url = next_first ? next_first.url : ''
                                        cell.quality = prepared_next.qualitys
                                        cell.subtitles = mergeSubtitles(next_first && next_first.subtitles, elem.subtitles)
                                        elem.mark()
                                        call()
                                    }, function() {
                                        cell.url = ''
                                        call()
                                    })
                                }
                            }
                            playlist.push(cell)
                        })

                        function startPlayback() {
                            Player.play({
                                url: play_url,
                                card: object.movie,
                                timeline: item.timeline,
                                quality: qualitys,
                                title: item.title,
                                subtitles: mergeSubtitles(first.subtitles, item.subtitles),
                                season: item.season,
                                episode: item.episode,
                                voice_name: item.voice_name,
                                playlist: playlist,
                                isonline: true
                            })
                        }

                        if (isExternalPlayer) {
                            var toPrefetch = playlist.filter(function(c) {
                                return c._prefetch
                            })
                            var total = toPrefetch.length
                            var completed = 0
                            if (total === 0) {
                                startPlayback()
                            } else {
                                toPrefetch.forEach(function(cell) {
                                    var idx = playlist.indexOf(cell)
                                    var elem = items[idx]
                                    if (!elem || !elem.ref) {
                                        cell.url = ''
                                        completed++
                                        if (completed >= total) startPlayback()
                                        return
                                    }
                                    getStream(elem.ref, function(next_streams) {
                                        var prepared_next = prepareStreams(next_streams)
                                        var next_first = prepared_next.first
                                        cell.url = next_first ? next_first.url : ''
                                        cell.quality = next_first ? prepared_next.qualitys : {}
                                        cell.subtitles = mergeSubtitles(next_first && next_first.subtitles, elem.subtitles)
                                        delete cell._prefetch
                                        completed++
                                        if (completed >= total) startPlayback()
                                    }, function() {
                                        cell.url = ''
                                        delete cell._prefetch
                                        completed++
                                        if (completed >= total) startPlayback()
                                    })
                                })
                            }
                        } else {
                            startPlayback()
                        }
                    }, function(errorText) {
                        comp.pushError(errorText || Lang.translate('online_nolink'))
                    })
                },
                onContextMenu: function onContextMenu(item, html, data, call) {
                    getStream(item.ref, function(streams) {
                        var prepared = prepareStreams(streams)
                        var first = prepared.first
                        var qualitys = prepared.qualitys
                        var play_url = first ? first.url : ''
                        if (!first || !play_url) {
                            comp.pushError(Lang.translate('online_nolink'))
                            return
                        }
                        var res = {
                            file: play_url,
                            quality: qualitys
                        }
                        if (item.season != null) res.season = item.season
                        if (item.episode != null) res.episode = item.episode
                        call(res)
                    }, function(errorText) {
                        comp.pushError(errorText || Lang.translate('online_nolink'))
                    })
                }
            })
            comp.loading(false)
        }

        function drawMovie(json) {
            var items = buildMovieItems(json)
            comp.draw(items, {
                onEnter: function onEnter(movie) {
                    getMovieStream(movie, function(prepared) {
                        var first = prepared.first
                        var qualitys = prepared.qualitys
                        var play_url = first ? first.url : ''
                        if (!first || !play_url) {
                            comp.pushError(Lang.translate('online_nolink'))
                            return
                        }
                        Player.play({
                            url: play_url,
                            card: object.movie,
                            timeline: movie.timeline,
                            quality: qualitys,
                            title: movie.player_title || movie.title,
                            subtitles: mergeSubtitles(first.subtitles, movie.subtitles)
                        })
                        Player.playlist([])
                    }, function(errorText) {
                        comp.pushError(errorText || Lang.translate('online_nolink'))
                    })
                },
                onContextMenu: function onContextMenu(movie, html, data, call) {
                    getMovieStream(movie, function(prepared) {
                        var first = prepared.first
                        var qualitys = prepared.qualitys
                        var play_url = first ? first.url : ''
                        if (!first || !play_url) {
                            comp.pushError(Lang.translate('online_nolink'))
                            return
                        }
                        call({
                            file: play_url,
                            quality: qualitys
                        })
                    }, function(errorText) {
                        comp.pushError(errorText || Lang.translate('online_nolink'))
                    })
                }
            })
            comp.loading(false)
        }

        function getMovieTitle() {
            return (object && object.movie && (object.movie.title || object.movie.name)) || ''
        }

        function getMovieStreamLabel(stream, index) {
            return stream.title || stream.quality || ('stream-' + (index + 1))
        }

        function normalizeMovieStreamTitle(stream, index) {
            var label = getMovieStreamLabel(stream, index)
            var title = String(stream && stream.title || '').trim()
            if (title) {
                var cleaned = title.replace(/^\[[^\]]+\]\s*/, '').trim()
                if (cleaned) return cleaned
            }
            return label
        }

        function normalizeMovieStreamQuality(stream) {
            return (stream && stream.quality) || ''
        }

        function buildMovieItems(json) {
            var streams = Array.isArray(json.streams) ? json.streams : []
            var movie_title = getMovieTitle()
            var items = streams.map(function(stream, index) {
                if (!stream || (!stream.url && !stream.ref)) return null
                var label = getMovieStreamLabel(stream, index)
                var stream_title = normalizeMovieStreamTitle(stream, index)
                var stream_quality = normalizeMovieStreamQuality(stream)
                return {
                    title: stream_title,
                    info: '',
                    quality: stream_quality,
                    voice_name: label,
                    file: '',
                    stream: stream,
                    streams: streams,
                    player_title: movie_title,
                    stream_ref: json.stream_ref || null,
                    subtitles: mergeSubtitles(stream.subtitles, json.subtitles)
                }
            }).filter(Boolean)

            if (items.length) return items

            var voices = Array.isArray(json.voices) ? json.voices : []
            var voice_items = voices.map(function(voice, index) {
                if (!voice) return null
                var label = normalizeVoiceName(voice) || ('Voice ' + (index + 1))
                var voice_stream_ref = voice.stream_ref || voice.ref || null
                var voice_streams = Array.isArray(voice.streams) ? voice.streams.filter(function(stream) {
                    return stream && (stream.url || stream.ref)
                }) : []
                if (!voice_stream_ref && !voice_streams.length) return null
                return {
                    title: label,
                    info: '',
                    quality: '',
                    voice_name: label,
                    file: '',
                    streams: voice_streams,
                    player_title: movie_title + (label ? ' / ' + label : ''),
                    stream_ref: voice_stream_ref,
                    subtitles: mergeSubtitles(voice.subtitles, json.subtitles)
                }
            }).filter(Boolean)

            if (voice_items.length) return voice_items

            return [{
                title: movie_title,
                info: '',
                quality: '',
                voice_name: '',
                file: '',
                streams: streams,
                player_title: movie_title,
                stream_ref: json.stream_ref || null,
                subtitles: normalizeSubtitles(json.subtitles)
            }]
        }

        function parsePackedStreamUrl(value) {
            var text = (value || '').toString().trim()
            if (!text || text.indexOf('[') === -1 || text.indexOf(']') === -1) return []
            var items = []
            text.split(',').forEach(function(part) {
                var match = part.match(/^\s*\[([^\]]+)\]\s*(.+)\s*$/)
                if (!match) return
                var quality = (match[1] || '').toString().trim()
                var url = (match[2] || '').toString().trim()
                if (!url) return
                items.push({
                    title: quality || 'auto',
                    quality: quality || 'auto',
                    url: url
                })
            })
            return items
        }

        function normalizeSubtitles(subtitles) {
            if (!Array.isArray(subtitles)) return []
            var index = -1
            return subtitles.map(function(subtitle) {
                if (!subtitle || !subtitle.url) return null
                index++
                return {
                    index: typeof subtitle.index !== 'undefined' ? subtitle.index : index,
                    label: subtitle.label || subtitle.lang || subtitle.language || (Lang.translate('player_subs') + ' ' + (index + 1)),
                    language: subtitle.language || subtitle.lang || subtitle.label || '',
                    url: subtitle.url
                }
            }).filter(Boolean)
        }

        function mergeSubtitles(primary, fallback) {
            var normalized_primary = normalizeSubtitles(primary)
            if (normalized_primary.length) return normalized_primary
            return normalizeSubtitles(fallback)
        }

        function prepareStreams(streams) {
            var qualitys = {}
            var first = null
            if (Array.isArray(streams)) {
                streams.forEach(function(stream, index) {
                    var variants = []
                    if (stream && stream.url) {
                        var packed = parsePackedStreamUrl(stream.url)
                        if (packed.length) {
                            variants = packed.map(function(item) {
                                var next = {}
                                Arrays.extend(next, stream, true)
                                next.title = item.title || stream.title || stream.quality
                                next.quality = item.quality || stream.quality
                                next.url = item.url
                                return next
                            })
                        }
                    }
                    if (!variants.length) variants = [stream]
                    variants.forEach(function(variant, variant_index) {
                        if (variant && variant.subtitles) {
                            variant.subtitles = normalizeSubtitles(variant.subtitles)
                        }
                        var label = variant.title || variant.quality || ('stream-' + (index + 1) + '-' + (variant_index + 1))
                        var url = variant && variant.url
                        if (url) qualitys[label] = url
                        if (!first && url) first = Object.assign({}, variant, { url: url })
                    })
                })
            }
            return {
                first: first,
                qualitys: qualitys
            }
        }

        function getStream(ref, success, fail) {
            var cache_key = Utils.hash(JSON.stringify(ref))
            if (stream_cache[cache_key]) {
                return success(stream_cache[cache_key])
            }
            if (!ref) {
                if (fail) fail()
                return
            }
            if (sourceKey === 'site111477' && ref.url) {
                var direct_streams = [{ url: ref.url, quality: 'auto' }]
                stream_cache[cache_key] = direct_streams
                return success(direct_streams)
            }
            api_client.getStream(sourceKey, ref, function(json) {
                if (!json || !json.ok || !Array.isArray(json.streams)) {
                    handleStreamError(json)
                    if (fail) fail(extractErrorText(json))
                    return
                }
                var stream_subtitles = normalizeSubtitles(json.subtitles)
                var streams = json.streams.map(function(stream) {
                    if (!stream || stream.subtitles || !stream_subtitles.length) return stream
                    var next = {}
                    Arrays.extend(next, stream, true)
                    next.subtitles = stream_subtitles
                    return next
                })
                stream_cache[cache_key] = streams
                success(streams)
            }, function() {
                if (fail) fail()
            })
        }

        function getMovieStream(movie, success, fail) {
            if (movie.stream) {
                if (movie.stream.url) {
                    success(prepareStreams([movie.stream]))
                    return
                }
                if (movie.stream.ref) {
                    getStream(movie.stream.ref, function(streams) {
                        success(prepareStreams(streams))
                    }, function(errorText) {
                        if (fail) fail(errorText)
                    })
                    return
                }
            }
            if (movie.stream_ref) {
                getStream(movie.stream_ref, function(streams) {
                    success(prepareStreams(streams))
                }, function(errorText) {
                    if (fail) fail(errorText)
                })
                return
            }
            if (movie.streams && movie.streams.length) {
                var direct = movie.streams.filter(function(stream) {
                    return stream && stream.url
                })
                if (direct.length) {
                    success(prepareStreams(direct))
                    return
                }
                var ref = movie.streams[0] && movie.streams[0].ref
                if (ref) {
                    getStream(ref, function(streams) {
                        success(prepareStreams(streams))
                    }, function(errorText) {
                        if (fail) fail(errorText)
                    })
                    return
                }
            }
            success({ first: null, qualitys: {} })
        }
    }
}

/**
 * HOOK TV one-tap Watch. Runs the same createV2 adapters as the source list,
 * but headless: every enabled source searches in parallel, the voice that fits
 * `want` is picked by Dub, and the first source (in the user's order) that
 * starts playing wins. The user never sees balancers.
 */
function autoSources(movie, call) {
    function pick(list) {
        var keys = list.filter(function(item) {
            return item && item.enabled !== false
        }).map(function(item) {
            return sourcesStore.normalizeName(item.key || item.name)
        }).filter(Boolean)
        var lang = (movie.original_language || '').toLowerCase()
        var anime = ['ja', 'ko', 'zh'].indexOf(lang) >= 0
        keys = keys.filter(function(key) {
            if (['bambooua', 'animeon', 'moonanime', 'mikai'].indexOf(key) >= 0) return anime
            if (key === 'starlight' || key === 'midnight') return lang === 'uk'
            return true
        })
        call(sourcesStore.applyUserFilters(keys))
    }

    if (sourcesStore.available_sources.length) return pick(sourcesStore.available_sources)

    new APIClient().getSources(function(json) {
        if (json && json.ok && Array.isArray(json.sources)) sourcesStore.saveAvailable(json.sources)
        pick(sourcesStore.available_sources)
    }, function() {
        call([])
    })
}

function autoProbe(key, movie, want) {
    return new Promise(function(resolve) {
        var api = new APIClient()
        var object = { movie: movie, verify: true }
        var candidates = []
        var serial = !!movie.name
        var finished = false
        var voice_chosen = false
        var seasons = 0
        var on_error = null
        var adapter

        var timer = setTimeout(function() {
            api.clear()
            finish(null, 'timeout')
        }, 8000)

        function finish(result, why) {
            if (finished) return
            finished = true
            clearTimeout(timer)
            console.log('Watch', key, result ? 'ready' : 'skip', why || '')
            resolve(result)
        }

        var comp = {
            api_client: api,
            loading: function() {},
            reset: function() {},
            disableSource: function() {},
            empty: function() { finish(null, 'empty') },
            doesNotAnswer: function() { finish(null, 'no answer') },
            pushError: function(text) {
                if (on_error) on_error(text)
            },
            similars: function(list) {
                candidates = Dub.rankSimilar(list, movie)
                comp.mismatch('no title match')
            },
            // the loaded title was another film: try the next candidate
            mismatch: function(why) {
                var next = candidates.shift()
                if (next) adapter.search(object, [next])
                else finish(null, why || 'wrong title')
            },
            filter: function(items, choice) {
                seasons = items.season ? items.season.length : 0
                if (voice_chosen || !items.voice || !items.voice.length) return
                voice_chosen = true
                var best = Dub.pickVoices(items.voice.map(function(name) {
                    return { name: name }
                }), want, key)[0]
                if (!best) return finish(null, 'no voice: ' + items.voice.join(', '))
                if (best.index !== choice.voice) adapter.filter('filter', { stype: 'voice' }, { index: best.index })
            },
            draw: function(items, params) {
                if (finished || !items.length) return

                var item
                if (serial) {
                    items.forEach(function(element) {
                        element.timeline = Timeline.view(getHashTimeline(movie, element.season, element.episode))
                        element.mark = function() {}
                        // player title reads "Show · S1 E3" instead of a bare "Серія 3"
                        element.title = (movie.name || movie.title) + ' · S' + element.season + ' E' + element.episode
                    })
                    item = items.find(function(element) {
                        return (element.timeline.percent || 0) < 90
                    })
                    // the whole season is watched: move on to the next one
                    if (!item && seasons > 1 && items[0].season < seasons) {
                        return adapter.filter('filter', { stype: 'season' }, { index: items[0].season })
                    }
                    item = item || items[0]
                } else {
                    var best = Dub.pickVoices(items.map(function(element) {
                        return { name: element.voice_name || element.title, hint: JSON.stringify(element.stream || element.streams || '') }
                    }), want, key)[0]
                    if (!best) return finish(null, 'no stream voice')
                    item = items[best.index]
                    item.timeline = Timeline.view(getHashTimeline(movie))
                }

                finish({
                    key: key,
                    play: function(success, fail) {
                        var started = function(e) {
                            // tells the player which audio / subtitles to start on
                            e.data.hooktv = want
                            Player.listener.remove('create', started)
                            on_error = null
                            success()
                        }
                        Player.listener.follow('create', started)
                        on_error = function(text) {
                            console.log('Watch', key, 'play failed', text || '')
                            Player.listener.remove('create', started)
                            on_error = null
                            fail(text)
                        }
                        params.onEnter(item)
                    }
                })
            }
        }

        adapter = new (createV2(key))(comp, object)
        adapter.search(object, [{}])
    })
}

// source keys that answered nothing for a title this session, per title
var unavailable = {}

function titleKey(movie) {
    return (movie.name ? 'tv:' : 'movie:') + (movie.id || movie.title || movie.name)
}

function markUnavailable(movie, key) {
    var id = titleKey(movie)
    unavailable[id] = unavailable[id] || {}
    unavailable[id][key] = true
}

/**
 * @param {object} movie TMDB card
 * @param {'uk'|'original'} want
 * @param {function(boolean)} done true once the player has started
 * @returns {function} cancel
 */
function autoPlay(movie, want, done, only) {
    var cancelled = false

    function start(keys) {
        var probes = keys.map(function(key) {
            return autoProbe(key, movie, want).then(function(found) {
                if (!found) markUnavailable(movie, key)
                return found
            })
        })
        // public-domain classics play even when no balancer has the title
        if (!only) probes.push(Archive.probe(movie))
        var index = 0

        function next() {
            if (cancelled) return
            if (index >= probes.length) return done(false)
            probes[index++].then(function(found) {
                if (cancelled) return
                if (!found) return next()
                var key = keys[index - 1]
                found.play(function() {
                    done(true, key)
                }, next)
            })
        }

        next()
    }

    // only: play through these balancers alone (switch from the player menu)
    if (only) start(only)
    else autoSources(movie, start)

    return function() {
        cancelled = true
    }
}

function escapeHtml(text) {
    if (!text) return ''
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
}

function component(object) {
    var api_client = new APIClient()
    this.api_client = api_client

    var scroll = new Scroll({ mask: true, over: true })
    var files = new Explorer(object)
    var filter = new Filter(object)
    var sources = {}

    function ensureSource(key) {
        if (key && !sources[key]) {
            sources[key] = createV2(key)
        }
        return sources[key]
    }

    var last
    var extended
    var selected_id
    var source
    var balanser
    var initialized
    var balanser_timer
    var images = []
    var disabled_sources = {}
    var filter_sources = buildFilterSources(object && object.movie)
    var self = this

    // the player settings menu lists the balancers and switches source through this
    function attachBalanser(e) {
        e.data.balanser = {
            current: balanser,
            list: filter_sources.filter(function(name) { return !isSourceDisabled(name) }),
            change: function(name) { self.changeBalanser(name) }
        }
    }
    var available_sources = sourcesStore.available_sources
    var tmdb_season_cache = {}

    var filter_translate = {
        season: Lang.translate('torrent_serial_season'),
        voice: Lang.translate('torrent_parser_voice'),
        source: Lang.translate('settings_rest_source')
    }

    function isSourceDisabled(name) {
        return !!disabled_sources[name]
    }

    function buildSourceSortItems() {
        return filter_sources.map(function(key) {
            var disabled = isSourceDisabled(key)
            return {
                title: sourcesStore.getTitle(key),
                source: key,
                selected: key === balanser,
                ghost: disabled,
                noenter: disabled
            }
        })
    }

    function updateSourceSort() {
        if (!filter) return
        filter.set('sort', buildSourceSortItems())
        filter.chosen('sort', [sourcesStore.getTitle(balanser)])
    }

    function resolveEpisodeNumber(value, fallback) {
        if (value === null || typeof value === 'undefined' || value === '') return fallback
        return value
    }

    function formatEpisodeNumber(value, fallback) {
        var episode = resolveEpisodeNumber(value, typeof fallback === 'undefined' ? 0 : fallback)
        var text = (episode + '').trim()
        if (!text) text = '0'
        return text.length < 2 ? '0' + text : text
    }

    function buildFilterSources(movie) {
        var srcList = getBaseSources()
        var include_anime = shouldIncludeAnimeSources(movie)
        var include_starlight = shouldIncludeStarlightSource(movie)
        var include_midnight = shouldIncludeMidnightSource(movie)

        if (include_anime) {
            if (srcList.indexOf('bambooua') === -1) srcList.push('bambooua')
            if (srcList.indexOf('animeon') === -1) srcList.push('animeon')
            if (srcList.indexOf('moonanime') === -1) srcList.push('moonanime')
            if (srcList.indexOf('mikai') === -1) srcList.push('mikai')
        } else {
            srcList = srcList.filter(function(name) {
                return name !== 'bambooua' && name !== 'animeon' && name !== 'moonanime' && name !== 'mikai'
            })
        }

        if (include_starlight) {
            if (srcList.indexOf('starlight') === -1) srcList.push('starlight')
        } else {
            srcList = srcList.filter(function(name) { return name !== 'starlight' })
        }

        if (include_midnight) {
            if (srcList.indexOf('midnight') === -1) srcList.push('midnight')
        } else {
            srcList = srcList.filter(function(name) { return name !== 'midnight' })
        }

        srcList = filterEnabledSources(srcList)
        srcList = sourcesStore.applyUserFilters(srcList)
        return srcList
    }

    function getBaseSources() {
        var from_api = getEnabledSources()
        if (from_api) return from_api
        var keys = Object.keys(sources)
        return keys.length ? keys : []
    }

    function filterEnabledSources(list) {
        var enabled = getEnabledSources()
        if (!enabled) return list
        return list.filter(function(name) {
            return enabled.indexOf(name) !== -1
        })
    }

    function getEnabledSources() {
        if (!available_sources || !available_sources.length) return null
        var enabled = available_sources.filter(function(item) {
            return item && item.enabled !== false
        }).map(function(item) {
            return sourcesStore.normalizeName(item.key || item.name)
        }).filter(Boolean)
        enabled.forEach(function(name) {
            ensureSource(name)
        })
        return enabled.length ? enabled : null
    }

    function loadAvailableSources(call) {
        var cached = Storage.get(sourcesStore.sources_key, null)
        api_client.getSources(function(json) {
            if (json && json.ok && Array.isArray(json.sources)) {
                applyAvailableSources(json.sources)
                sourcesStore.saveAvailable(json.sources)
            } else if (cached && Array.isArray(cached)) {
                applyAvailableSources(cached)
            }
            call()
        }, function() {
            if (cached && Array.isArray(cached)) applyAvailableSources(cached)
            call()
        })
    }

    function applyAvailableSources(list) {
        available_sources = list
        list.forEach(function(item) {
            if (!item || (!item.name && !item.key)) return
            var display = item.display_name || item.displayName || item.display || item.title || item.label || item.name || ''
            var key = sourcesStore.normalizeName(item.key || item.name)
            if (key) {
                ensureSource(key)
                if (display) sourcesStore.titles[key] = display
            }
        })
    }

    function shouldIncludeAnimeSources(movie) {
        if (!movie) return true
        var lang = movie.original_language
        var has_lang = !!lang
        var is_anime_lang = lang === 'ja' || lang === 'zh'
        var is_dorama_lang = lang === 'ko'
        var has_anime_genre = Array.isArray(movie.genres) && movie.genres.some(function(g) {
            return g && g.id === 16
        })
        var title = movie.original_title || movie.original_name || movie.title || movie.name || ''
        var has_japanese_title = Utils.containsJapanese ? Utils.containsJapanese(title) : false
        var is_anime = (is_anime_lang && (has_anime_genre || has_japanese_title)) || has_japanese_title
        return !has_lang || is_anime || is_dorama_lang
    }

    function shouldIncludeStarlightSource(movie) {
        if (!movie) return false
        return (movie.original_language || '').toLowerCase() === 'uk'
    }

    function shouldIncludeMidnightSource(movie) {
        if (!movie) return false
        return (movie.original_language || '').toLowerCase() === 'uk'
    }

    function getYear(movie) {
        var date = movie.release_date || movie.first_air_date || movie.year || movie.start_date
        return date ? (date + '').slice(0, 4) : ''
    }

    function getTmdbId(movie) {
        if (!movie) return ''
        if (movie.tmdb_id) return movie.tmdb_id
        if (typeof movie.id === 'number' || (typeof movie.id === 'string' && /^\d+$/.test(movie.id))) return movie.id
        return ''
    }

    this.initialize = function() {
        var _this = this

        Player.listener.follow('create', attachBalanser)

        loadAvailableSources(function() {
            filter_sources = buildFilterSources(object && object.movie)
            source = _this.createSource()

            filter.onSearch = function(value) {
                Activity.replace({
                    search: value,
                    clarification: true
                })
            }
            filter.onBack = function() {
                _this.start()
            }
            filter.render().find('.selector').on('hover:enter', function() {
                clearInterval(balanser_timer)
            })
            filter.onSelect = function(type, a, b) {
                if (type === 'filter') {
                    if (a.reset) {
                        if (extended) source.reset()
                        else _this.start()
                    } else if (a.stype === 'source') {
                        Select.close()
                        _this.changeBalanser(b.source)
                    } else {
                        source.filter(type, a, b)
                    }
                } else if (type === 'sort') {
                    Select.close()
                    _this.changeBalanser(a.source)
                }
            }

            if (filter.addButtonBack) filter.addButtonBack()
            filter.render().find('.filter--sort span').text(Lang.translate('online_balanser'))

            files.appendFiles(scroll.render())
            files.appendHead(filter.render())
            scroll.body().addClass('torrent-list')
            scroll.minus(files.render().find('.explorer__files-head'))
            _this.search()
        })
    }

    this.changeBalanser = function(balanser_name) {
        if (isSourceDisabled(balanser_name)) return
        var last_select = Storage.cache('online_last_balanser', 3000, {})
        last_select[object.movie.id] = balanser_name
        Storage.set('online_last_balanser', last_select)
        Storage.set('hook_online_last_balanser', last_select)
        Storage.set('hook_online_balanser', balanser_name)

        var to = this.getChoice(balanser_name)
        var from = this.getChoice()
        if (from.voice_name) to.voice_name = from.voice_name
        this.saveChoice(to, balanser_name)
        this.reset()
        source = this.createSource()
        this.search()
    }

    this.createSource = function() {
        var last_select = Storage.cache('online_last_balanser', 3000, {}) || Storage.cache('hook_online_last_balanser', 3000, {})
        if (last_select[object.movie.id]) {
            balanser = last_select[object.movie.id]
        } else {
            balanser = Storage.get('hook_online_balanser', 'uatut')
        }
        if (!ensureSource(balanser) || filter_sources.indexOf(balanser) === -1) {
            balanser = filter_sources[0] || 'uatut'
        }
        if (!ensureSource(balanser)) {
            return null
        }
        return new sources[balanser](this, object)
    }

    this.create = function() {
        return this.render()
    }

    this.search = function() {
        this.activity.loader(true)
        this.filter({ source: filter_sources }, this.getChoice())
        this.find()
    }

    this.find = function() {
        if (object.movie.imdb_id && source.searchByImdbID) {
            this.extendChoice()
            source.searchByImdbID(object, object.movie.imdb_id)
            return
        }
        if (object.movie.kinopoisk_id && source.searchByKinopoisk) {
            this.extendChoice()
            source.searchByKinopoisk(object, object.movie.kinopoisk_id)
            return
        }
        if (object.movie.mal_id && source.searchByMalId) {
            this.extendChoice()
            source.searchByMalId(object, object.movie.mal_id)
            return
        }
        if (source.searchByTitle) {
            this.extendChoice()
            source.searchByTitle(object, object.movie.title || object.movie.name)
            return
        }
        if (source.search) {
            this.extendChoice()
            source.search(object, [{
                title: object.movie.title || object.movie.name,
                original_title: object.movie.original_title || object.movie.original_name,
                imdb_id: object.movie.imdb_id,
                tmdb_id: getTmdbId(object.movie),
                kinopoisk_id: object.movie.kinopoisk_id,
                mal_id: object.movie.mal_id,
                year: getYear(object.movie)
            }])
            return
        }
        this.doesNotAnswer()
    }

    this.getChoice = function(for_balanser) {
        var targetBalanser = for_balanser || balanser
        var data = Storage.cache('hook_online_choice_' + targetBalanser, 3000, {})
        var save = data[selected_id || object.movie.id] || {}
        Arrays.extend(save, {
            season: 0,
            voice: 0,
            voice_name: '',
            voice_id: 0,
            episodes_view: {},
            movie_view: ''
        })
        return save
    }

    this.extendChoice = function() {
        extended = true
        source.extendChoice(this.getChoice())
    }

    this.saveChoice = function(choice, for_balanser) {
        var targetBalanser = for_balanser || balanser
        var data = Storage.cache('hook_online_choice_' + targetBalanser, 3000, {})
        data[selected_id || object.movie.id] = choice
        Storage.set('hook_online_choice_' + targetBalanser, data)
    }

    this.similars = function(json) {
        var _this = this
        json.forEach(function(elem) {
            var info = []
            var year = ((elem.year || elem.start_date || '') + '').slice(0, 4)
            if (year) info.push(year)
            if (elem.season) info.push(Lang.translate('torrent_serial_season') + ' ' + elem.season)
            var name = elem.title || elem.name || ''
            var orig = elem.title_en || elem.original_title || elem.orig_title || ''
            elem.title = escapeHtml(name + (orig && orig !== name ? ' / ' + orig : ''))
            elem.time = elem.time || ''
            elem.info = info.join('<span class="online-prestige-split">●</span>')

            var item = Template.get('hook_online_folder', elem)
            if (elem.poster && (elem.source === 'uaflix' || balanser === 'uaflix')) {
                var folder = item.find('.online-prestige__folder')
                var poster = $('<div class="online-prestige__img online-prestige__img--loaded"><img alt="" src="' + escapeHtml(elem.poster) + '"></div>')
                var img = poster.find('img')[0]
                img.onerror = function() {
                    poster.replaceWith(folder)
                }
                folder.replaceWith(poster)
            }

            item.on('hover:enter', function() {
                _this.activity.loader(true)
                _this.reset()
                object.search_date = year
                selected_id = elem.id
                _this.extendChoice()
                var kinopoisk_id = elem.kp_id || elem.filmId
                var mal_id = elem.mal_id || elem.malId
                var has_aggregated_ref = elem.ref && Array.isArray(elem.ref.seasons) && elem.ref.seasons.length
                if (has_aggregated_ref && source.search) {
                    source.search(object, [elem])
                } else if (kinopoisk_id && source.searchByKinopoisk) {
                    source.searchByKinopoisk(object, kinopoisk_id)
                } else if (mal_id && source.searchByMalId) {
                    source.searchByMalId(object, mal_id)
                } else if (source.search) {
                    source.search(object, [elem])
                } else {
                    _this.doesNotAnswer()
                }
            }).on('hover:focus', function(e) {
                last = e.target
                scroll.update($(e.target), true)
            })
            scroll.append(item)
        })
    }

    this.clearImages = function() {
        images.forEach(function(img) {
            img.onerror = function() {}
            img.onload = function() {}
            img.src = ''
        })
        images = []
    }

    this.reset = function() {
        last = false
        clearInterval(balanser_timer)
        api_client.clear()
        this.clearImages()
        scroll.render().find('.empty').remove()
        scroll.clear()
    }

    this.loading = function(status) {
        if (status) this.activity.loader(true)
        else {
            this.activity.loader(false)
            this.activity.toggle()
        }
    }

    this.filter = function(filt_items, choice) {
        var _this = this
        var select = []
        var add = function(type, title) {
            var need = _this.getChoice()
            var items = filt_items[type]
            var subitems = []
            var value = need[type]
            items.forEach(function(name, i) {
                subitems.push({
                    title: name,
                    selected: value === i,
                    index: i
                })
            })
            select.push({
                title: title,
                subtitle: items[value],
                items: subitems,
                stype: type
            })
        }
        filt_items.source = filter_sources
        select.push({
            title: Lang.translate('torrent_parser_reset'),
            reset: true
        })
        if (filter_sources && filter_sources.length) {
            var subitems = []
            filter_sources.forEach(function(name, i) {
                subitems.push({
                    title: sourcesStore.getTitle(name),
                    selected: name === balanser,
                    index: i,
                    source: name
                })
            })
            select.push({
                title: Lang.translate('online_balanser'),
                subtitle: sourcesStore.getTitle(balanser),
                items: subitems,
                stype: 'source'
            })
        }
        this.saveChoice(choice)
        if (filt_items.voice && filt_items.voice.length) add('voice', Lang.translate('torrent_parser_voice'))
        if (filt_items.season && filt_items.season.length) add('season', Lang.translate('torrent_serial_season'))
        filter.set('filter', select)
        filter.set('sort', buildSourceSortItems())
        this.selected(filt_items)
    }

    this.disableSource = function(source_name, reason) {
        var key = sourcesStore.normalizeName(source_name)
        if (!key) return
        if (!disabled_sources[key]) {
            disabled_sources[key] = { reason: reason || '' }
            updateSourceSort()
        }
    }

    this.pushError = function(text) {
        if (text) Bell.push({ text: text })
    }

    this.closeFilter = function() {
        if ($('body').hasClass('selectbox--open')) Select.close()
    }

    this.selected = function(filt_items) {
        var need = this.getChoice(), select = []
        for (var i in need) {
            if (filt_items[i] && filt_items[i].length) {
                if (i === 'voice') {
                    select.push(filter_translate[i] + ': ' + filt_items[i][need[i]])
                } else if (i !== 'source') {
                    if (filt_items.season.length >= 1) {
                        select.push(filter_translate.season + ': ' + filt_items[i][need[i]])
                    }
                }
            }
        }
        filter.chosen('filter', select)
        filter.chosen('sort', [sourcesStore.getTitle(balanser)])
    }

    this.getEpisodes = function(season, call) {
        var id = getTmdbId(object.movie)
        var cache_key = id + '_' + season
        if (tmdb_season_cache[cache_key]) {
            return call(tmdb_season_cache[cache_key])
        }
        if (id && object.movie.name && window.Lampa && window.Lampa.Api && window.Lampa.Api.sources && window.Lampa.Api.sources.tmdb) {
            window.Lampa.Api.sources.tmdb.get('tv/' + id + '/season/' + season, {}, function(data) {
                tmdb_season_cache[cache_key] = data.episodes || []
                call(tmdb_season_cache[cache_key])
            }, function() {
                call([])
            })
        } else call([])
    }

    this.append = function(item) {
        item.on('hover:focus', function(e) {
            last = e.target
            scroll.update($(e.target), true)
        })
        scroll.append(item)
    }

    this.watched = function(set) {
        var file_id = getFileId(object.movie)
        var watched = Storage.cache('online_watched_last', 5000, {})
        if (set) {
            if (!watched[file_id]) watched[file_id] = {}
            Arrays.extend(watched[file_id], set, true)
            Storage.set('online_watched_last', watched)
            this.updateWatched()
        } else {
            return watched[file_id]
        }
    }

    this.updateWatched = function() {
        var watched = this.watched()
        var body = scroll.body().find('.online-prestige-watched .online-prestige-watched__body').empty()
        if (watched) {
            var line = []
            if (watched.balanser_name) line.push(watched.balanser_name)
            if (watched.voice_name) line.push(watched.voice_name)
            if (watched.season) line.push(Lang.translate('torrent_serial_season') + ' ' + watched.season)
            if (watched.episode) line.push(Lang.translate('torrent_serial_episode') + ' ' + watched.episode)
            line.forEach(function(n) {
                body.append('<span>' + n + '</span>')
            })
        } else body.append('<span>' + Lang.translate('online_no_watch_history') + '</span>')
    }

    this.draw = function(items, params) {
        var _this = this
        params = params || {}
        if (!items.length) return this.empty()

        scroll.append(Template.get('hook_online_watched', {}))
        this.updateWatched()

        this.getEpisodes(items[0].season, function(episodes) {
            var viewed = Storage.cache('online_view', 5000, [])
            var serial = object.movie.name ? true : false
            var choice = _this.getChoice()
            var fully = window.innerWidth > 480
            var scroll_to_element = false
            var scroll_to_mark = false

            items.forEach(function(element, index) {
                var episode = serial && episodes.length && !params.similars ? episodes.find(function(e) {
                    return e.episode_number == element.episode
                }) : false

                var episode_num = resolveEpisodeNumber(element.episode, index + 1)
                var episode_last = choice.episodes_view[element.season]

                Arrays.extend(element, {
                    info: '',
                    quality: '',
                    time: Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true)
                })

                var hash_timeline = getHashTimeline(object.movie, element.season, element.episode)
                var hash_behold = getHashBehold(object.movie, element.season, element.episode, element.voice_name)
                var data = { hash_timeline: hash_timeline, hash_behold: hash_behold }
                var info = []

                if (element.season) {
                    element.translate_episode_end = _this.getLastEpisode(items)
                    element.translate_voice = element.voice_name
                }
                element.timeline = Timeline.view(hash_timeline)

                if (episode) {
                    element.title = escapeHtml(episode.name)
                    if (element.info.length < 30 && episode.vote_average) {
                        info.push(Template.get('hook_online_rate', {
                            rate: parseFloat(episode.vote_average + '').toFixed(1)
                        }, true))
                    }
                    if (episode.air_date && fully) info.push(Utils.parseTime(episode.air_date).full)
                } else if (object.movie.release_date && fully) {
                    info.push(Utils.parseTime(object.movie.release_date).full)
                }

                if (!serial && object.movie.tagline && element.info.length < 30) info.push(escapeHtml(object.movie.tagline))
                if (element.info) info.push(element.info)

                if (info.length) {
                    element.info = info.map(function(i) {
                        return '<span>' + i + '</span>'
                    }).join('<span class="online-prestige-split">●</span>')
                }

                var html = Template.get('hook_online_full', element)
                var loader = html.find('.online-prestige__loader')
                var image = html.find('.online-prestige__img')

                if (!serial) {
                    if (choice.movie_view === hash_behold) scroll_to_element = html
                } else if (typeof episode_last !== 'undefined' && episode_last == episode_num) {
                    scroll_to_element = html
                }

                if (serial && !episode) {
                    image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode, index + 1) + '</div>')
                    loader.remove()
                } else {
                    var img = html.find('img')[0]
                    img.onerror = function() {
                        img.src = './img/img_broken.svg'
                    }
                    img.onload = function() {
                        image.addClass('online-prestige__img--loaded')
                        loader.remove()
                        if (serial) image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(element.episode, index + 1) + '</div>')
                    }
                    var path = episode ? episode.still_path : object.movie.backdrop_path
                    if (path) img.src = TMDB.image('t/p/w300' + path)
                    else img.src = './img/img_broken.svg'
                    images.push(img)
                }

                html.find('.online-prestige__timeline').append(Timeline.render(element.timeline))

                if (viewed.indexOf(hash_behold) !== -1) {
                    scroll_to_mark = html
                    html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Template.get('icon_viewed', {}, true) + '</div>')
                }

                element.mark = function() {
                    viewed = Storage.cache('online_view', 5000, [])
                    if (viewed.indexOf(hash_behold) === -1) {
                        viewed.push(hash_behold)
                        Storage.set('online_view', viewed)
                        if (html.find('.online-prestige__viewed').length === 0) {
                            html.find('.online-prestige__img').append('<div class="online-prestige__viewed">' + Template.get('icon_viewed', {}, true) + '</div>')
                        }
                    }
                    choice = _this.getChoice()
                    if (!serial) {
                        choice.movie_view = hash_behold
                    } else {
                        choice.episodes_view[element.season] = episode_num
                    }
                    _this.saveChoice(choice)
                    _this.watched({
                        balanser: balanser,
                        balanser_name: sourcesStore.getTitle(balanser),
                        voice_id: choice.voice_id,
                        voice_name: choice.voice_name || element.voice_name,
                        episode: element.episode,
                        season: element.season
                    })
                }

                element.unmark = function() {
                    viewed = Storage.cache('online_view', 5000, [])
                    if (viewed.indexOf(hash_behold) !== -1) {
                        Arrays.remove(viewed, hash_behold)
                        Storage.set('online_view', viewed)
                        html.find('.online-prestige__viewed').remove()
                    }
                }

                element.timeclear = function() {
                    element.timeline.percent = 0
                    element.timeline.time = 0
                    element.timeline.duration = 0
                    Timeline.update(element.timeline)
                }

                html.on('hover:enter', function() {
                    if (params.onEnter) params.onEnter(element, html, data)
                }).on('hover:focus', function(e) {
                    last = e.target
                    if (params.onFocus) params.onFocus(element, html, data)
                    scroll.update($(e.target), true)
                })

                if (params.onRender) params.onRender(element, html, data)

                _this.contextMenu({
                    html: html,
                    element: element,
                    onFile: function(call) {
                        if (params.onContextMenu) params.onContextMenu(element, html, data, call)
                    },
                    onClearAllMark: function() {
                        items.forEach(function(elem) { elem.unmark() })
                    },
                    onClearAllTime: function() {
                        items.forEach(function(elem) { elem.timeclear() })
                    }
                })

                scroll.append(html)
            })

            if (serial && episodes.length > items.length && !params.similars) {
                var left = episodes.slice(items.length)
                left.forEach(function(episode) {
                    var info = []
                    if (episode.vote_average) {
                        info.push(Template.get('hook_online_rate', {
                            rate: parseFloat(episode.vote_average + '').toFixed(1)
                        }, true))
                    }
                    if (episode.air_date) info.push(Utils.parseTime(episode.air_date).full)
                    var air = new Date((episode.air_date + '').replace(/-/g, '/'))
                    var now = Date.now()
                    var day = Math.round((air.getTime() - now) / (24 * 60 * 60 * 1000))
                    var txt = Lang.translate('full_episode_days_left') + ': ' + day
                    var html = Template.get('hook_online_full', {
                        time: Utils.secondsToTime((episode ? episode.runtime : object.movie.runtime) * 60, true),
                        info: info.length ? info.map(function(i) {
                            return '<span>' + i + '</span>'
                        }).join('<span class="online-prestige-split">●</span>') : '',
                        title: escapeHtml(episode.name),
                        quality: day > 0 ? txt : ''
                    })
                    var loader = html.find('.online-prestige__loader')
                    var image = html.find('.online-prestige__img')
                    var season = items[0] ? items[0].season : 1

                    html.find('.online-prestige__timeline').append(Timeline.render(Timeline.view(getHashTimeline(object.movie, season, episode.episode_number))))
                    var img = html.find('img')[0]
                    if (episode.still_path) {
                        img.onerror = function() { img.src = './img/img_broken.svg' }
                        img.onload = function() {
                            image.addClass('online-prestige__img--loaded')
                            loader.remove()
                            image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>')
                        }
                        img.src = TMDB.image('t/p/w300' + episode.still_path)
                        images.push(img)
                    } else {
                        img.src = './img/img_broken.svg'
                        loader.remove()
                        image.append('<div class="online-prestige__episode-number">' + formatEpisodeNumber(episode.episode_number) + '</div>')
                    }
                    html.on('hover:focus', function(e) {
                        last = e.target
                        scroll.update($(e.target), true)
                    })
                    scroll.append(html)
                })
            }

            if (scroll_to_element) {
                last = scroll_to_element[0]
            } else if (scroll_to_mark) {
                last = scroll_to_mark[0]
            }
            Controller.enable('content')
        })
    }

    this.contextMenu = function(params) {
        params.html.on('hover:long', function() {
            function show(extra) {
                var enabled = Controller.enabled().name
                var menu = []
                if (Platform.is('webos')) {
                    menu.push({ title: Lang.translate('player_lauch') + ' - WebOS', player: 'webos' })
                }
                if (Platform.is('android')) {
                    menu.push({ title: Lang.translate('player_lauch') + ' - Android', player: 'android' })
                }
                menu.push({ title: Lang.translate('player_lauch') + ' - HOOK TV', player: 'lampa' })
                menu.push({ title: Lang.translate('online_video'), separator: true })
                menu.push({ title: Lang.translate('torrent_parser_label_title'), mark: true })
                menu.push({ title: Lang.translate('torrent_parser_label_cancel_title'), unmark: true })
                menu.push({ title: Lang.translate('time_reset'), timeclear: true })
                if (extra) {
                    menu.push({ title: Lang.translate('copy_link'), copylink: true })
                }
                menu.push({ title: Lang.translate('more'), separator: true })
                menu.push({ title: Lang.translate('online_clear_all_marks'), clearallmark: true })
                menu.push({ title: Lang.translate('online_clear_all_timecodes'), timeclearall: true })

                Select.show({
                    title: Lang.translate('title_action'),
                    items: menu,
                    onBack: function() {
                        Controller.toggle(enabled)
                    },
                    onSelect: function(a) {
                        if (a.mark) params.element.mark()
                        if (a.unmark) params.element.unmark()
                        if (a.timeclear) params.element.timeclear()
                        if (a.clearallmark) params.onClearAllMark()
                        if (a.timeclearall) params.onClearAllTime()
                        Controller.toggle(enabled)
                        if (a.player) {
                            Player.runas(a.player)
                            params.html.trigger('hover:enter')
                        }
                        if (a.copylink) {
                            if (extra.quality) {
                                var qual = []
                                for (var i in extra.quality) {
                                    qual.push({ title: i, file: extra.quality[i] })
                                }
                                Select.show({
                                    title: Lang.translate('settings_server_links'),
                                    items: qual,
                                    onBack: function() { Controller.toggle(enabled) },
                                    onSelect: function(b) {
                                        Utils.copyTextToClipboard(b.file, function() {
                                            Noty.show(Lang.translate('copy_secuses'))
                                        }, function() {
                                            Noty.show(Lang.translate('copy_error'))
                                        })
                                    }
                                })
                            } else {
                                Utils.copyTextToClipboard(extra.file, function() {
                                    Noty.show(Lang.translate('copy_secuses'))
                                }, function() {
                                    Noty.show(Lang.translate('copy_error'))
                                })
                            }
                        }
                    }
                })
            }
            params.onFile(show)
        })
    }

    this.empty = function() {
        var html = Template.get('hook_online_does_not_answer', {})
        html.find('.online-empty__buttons').remove()
        html.find('.online-empty__title').text(Lang.translate('empty_title_two'))
        html.find('.online-empty__time').text(Lang.translate('empty_text'))
        scroll.append(html)
        this.loading(false)
    }

    this.doesNotAnswer = function() {
        var _this = this
        this.reset()
        var html = Template.get('hook_online_does_not_answer', {
            balanser: sourcesStore.getTitle(balanser)
        })
        var tic = 10
        html.find('.cancel').on('hover:enter', function() {
            clearInterval(balanser_timer)
        })
        html.find('.change').on('hover:enter', function() {
            clearInterval(balanser_timer)
            filter.render().find('.filter--sort').trigger('hover:enter')
        })
        html.find('.search_all').on('hover:enter', function() {
            clearInterval(balanser_timer)
            _this.searchAll()
        })
        scroll.append(html)
        this.loading(false)
        balanser_timer = setInterval(function() {
            tic--
            html.find('.timeout').text(tic)
            if (tic === 0) {
                clearInterval(balanser_timer)
                var keys = filter_sources.slice(0)
                if (!keys.length) keys = Arrays.getKeys(sources)
                var indx = keys.indexOf(balanser)
                var next = null
                for (var i = 1; i <= keys.length; i++) {
                    var candidate = keys[(indx + i) % keys.length]
                    if (!isSourceDisabled(candidate)) {
                        next = candidate
                        break
                    }
                }
                if (next && next !== balanser) {
                    balanser = next
                    if (Activity.active().activity === _this.activity) _this.changeBalanser(balanser)
                }
            }
        }, 1000)
    }

    this.searchAll = function() {
        var _this = this
        this.reset()
        this.loading(true)
        var params = {
            title: object.movie.title || object.movie.name,
            original_title: object.movie.original_title || object.movie.original_name,
            imdb_id: object.movie.imdb_id,
            tmdb_id: getTmdbId(object.movie),
            kinopoisk_id: object.movie.kinopoisk_id,
            mal_id: object.movie.mal_id,
            year: getYear(object.movie)
        }
        api_client.search(params, filter_sources, function(json) {
            _this.loading(false)
            if (json && json.ok && Array.isArray(json.items) && json.items.length) {
                _this.similars(json.items)
            } else {
                _this.empty()
            }
        }, function() {
            _this.loading(false)
            _this.empty()
        })
    }

    this.getLastEpisode = function(items) {
        var last_episode = 0
        items.forEach(function(e) {
            if (typeof e.episode !== 'undefined') last_episode = Math.max(last_episode, parseInt(e.episode))
        })
        return last_episode
    }

    this.start = function() {
        if (Activity.active().activity !== this.activity) return
        if (!initialized) {
            initialized = true
            this.initialize()
        }
        Background.immediately(Utils.cardImgBackgroundBlur(object.movie))
        Controller.add('content', {
            toggle: function() {
                Controller.collectionSet(scroll.render(), files.render())
                Controller.collectionFocus(last || false, scroll.render())
            },
            up: function() {
                if (Navigator.canmove('up')) {
                    Navigator.move('up')
                } else Controller.toggle('head')
            },
            down: function() {
                Navigator.move('down')
            },
            right: function() {
                if (Navigator.canmove('right')) Navigator.move('right')
                else filter.show(Lang.translate('title_filter'), 'filter')
            },
            left: function() {
                if (Navigator.canmove('left')) Navigator.move('left')
                else Controller.toggle('menu')
            },
            gone: function() {
                clearInterval(balanser_timer)
            },
            back: this.back
        })
        Controller.toggle('content')
    }

    this.render = function() {
        return files.render()
    }
    this.back = function() {
        Activity.backward()
    }
    this.pause = function() {
        this.stop()
    }
    this.stop = function() {
        api_client.clear()
        clearInterval(balanser_timer)
        if (source && source.cancel) source.cancel()
    }
    this.destroy = function() {
        api_client.clear()
        this.clearImages()
        files.destroy()
        scroll.destroy()
        clearInterval(balanser_timer)
        Player.listener.remove('create', attachBalanser)
        if (source) source.destroy()
    }
}

// Filmix Settings & Helpers
var filmixAuthTimer = null
var filmixHeaderLoading = false

function getStoredFilmixMaxQuality() {
    var raw = Storage.get(AUTH_KEYS.filmixMaxQuality, 0)
    var parsed = parseInt(raw, 10)
    return isNaN(parsed) || parsed <= 0 ? 0 : parsed
}

function setStoredFilmixMaxQuality(value) {
    var parsed = parseInt(value, 10)
    var quality = isNaN(parsed) || parsed <= 0 ? 0 : parsed
    Storage.set(AUTH_KEYS.filmixMaxQuality, quality || '')
    return quality
}

function getFilmixTitle(quality) {
    var base = 'Filmix'
    return quality ? base + ' (' + quality + 'p)' : base
}

function setFilmixTitle(item, quality) {
    if (!item || !item.length) return
    var text = getFilmixTitle(quality)
    var name = item.find('.settings-param__name')
    if (name.length) name.text(text)
    else item.find('span').first().text(text)
}

function setFilmixTokenButtonTitle(item) {
    if (!item || !item.length) return
    var status = getFilmixToken() ? Lang.translate('hook_online_filmix_token_state_set') : Lang.translate('hook_online_filmix_token_state_empty')
    var title = Lang.translate('hook_online_filmix_auth_token') + ' (' + status + ')'
    var name = item.find('.settings-param__name')
    if (name.length) name.text(title)
}

function stopFilmixPolling() {
    if (filmixAuthTimer) {
        clearInterval(filmixAuthTimer)
        filmixAuthTimer = null
    }
}

function requestFilmixUser(token, success, fail, deviceIdOverride) {
    var authToken = normalize(token)
    var deviceId = normalize(deviceIdOverride) || getFilmixDeviceId()
    if (!authToken) {
        if (fail) fail(Lang.translate('hook_online_filmix_auth_required'))
        return
    }
    if (!deviceId) {
        if (fail) fail(Lang.translate('hook_online_filmix_auth_error'))
        return
    }
    var network = new Reguest()
    var url = Utils.addUrlComponent(config.api_base + '/filmix/user', 'token=' + encodeURIComponent(authToken) + '&device_id=' + encodeURIComponent(deviceId))
    network.silent(url, function(json) {
        if (success) success(json)
    }, function(a, c) {
        if (fail) fail(network.errorDecode(a, c))
    })
}

function refreshFilmixTitle(item) {
    setFilmixTitle(item, getStoredFilmixMaxQuality())
    var token = getFilmixToken()
    if (!token || filmixHeaderLoading) return
    filmixHeaderLoading = true
    requestFilmixUser(token, function(json) {
        filmixHeaderLoading = false
        if (!json || !json.ok || !json.authorized) return
        var quality = setStoredFilmixMaxQuality(json.max_quality)
        setFilmixTitle(item, quality)
    }, function() {
        filmixHeaderLoading = false
    })
}

function saveFilmixToken(value) {
    var token = normalize(value)
    setFilmixToken(token)
    setStoredFilmixMaxQuality(0)
    if (token) {
        ensureFilmixDeviceId()
        Noty.show(Lang.translate('hook_online_filmix_token_saved'))
    } else {
        Noty.show(Lang.translate('hook_online_filmix_auth_reset_done'))
    }
    SettingsApi.update()
}

function openFilmixTokenInput() {
    var current = getFilmixToken()
    if (Input && typeof Input.edit === 'function') {
        Input.edit({
            title: Lang.translate('hook_online_filmix_auth_token'),
            value: current,
            free: true,
            nosave: true,
            nomic: true
        }, function(value) {
            saveFilmixToken(value)
        })
        return
    }
    if (typeof window.prompt !== 'function') {
        Noty.show(Lang.translate('hook_online_filmix_auth_error'))
        return
    }
    var next = window.prompt(Lang.translate('hook_online_filmix_auth_token'), current)
    if (next === null) return
    saveFilmixToken(next)
}

function openFilmixAuthModal(token, userCode, deviceId) {
    stopFilmixPolling()
    var code = normalize(userCode)
    var status = Lang.translate('hook_online_filmix_modal_wait')
    var modal = $(`
        <div>
            <div class="broadcast__text">${Lang.translate('hook_online_filmix_modal_text')}</div>
            <div class="broadcast__device selector" style="text-align:center;background-color:rgba(10,132,255,0.25);color:white;font-weight:700;font-size:1.8em;padding:0.4em;border-radius:0.4em;">${code}</div>
            <br>
            <div class="broadcast__scan"><div></div></div>
            <div class="settings-param__descr" style="margin-top:1em;text-align:center;">${status}</div>
        </div>
    `)

    var codeEl = modal.find('.broadcast__device')
    var statusEl = modal.find('.settings-param__descr')
    codeEl.on('hover:enter', function() {
        Utils.copyTextToClipboard(code, function() {
            Noty.show(Lang.translate('copy_secuses'))
        }, function() {
            Noty.show(Lang.translate('copy_error'))
        })
    })

    function closeModal() {
        stopFilmixPolling()
        Modal.close()
        Controller.toggle('settings_component')
    }

    function markAuthorized(json) {
        stopFilmixPolling()
        setFilmixToken(token)
        setStoredFilmixMaxQuality(json && json.max_quality)
        var quality = json && json.max_quality ? json.max_quality + 'p' : 'auto'
        statusEl.text(Lang.translate('hook_online_filmix_modal_success') + ' (' + quality + ')')
        SettingsApi.update()
        Noty.show(Lang.translate('hook_online_filmix_modal_authorized'))
        setTimeout(closeModal, 600)
    }

    filmixAuthTimer = setInterval(function() {
        requestFilmixUser(token, function(json) {
            if (!json || !json.ok) return
            if (json.authorized) markAuthorized(json)
        }, null, deviceId)
    }, 10000)

    Modal.open({
        title: Lang.translate('hook_online_filmix_modal_title'),
        html: modal,
        size: 'small',
        scroll_to_center: true,
        select: codeEl[0],
        onBack: function() {
            closeModal()
        }
    })
}

function startFilmixAuthFlow() {
    var deviceId = Utils.uid(16)
    var network = new Reguest()
    var url = Utils.addUrlComponent(config.api_base + '/filmix/key', 'device_id=' + encodeURIComponent(deviceId))
    setFilmixDeviceId(deviceId)
    setFilmixToken('')
    setStoredFilmixMaxQuality(0)
    SettingsApi.update()

    network.silent(url, function(json) {
        if (!json || !json.ok) {
            Noty.show(extractErrorText(json) || Lang.translate('hook_online_filmix_auth_error'))
            return
        }
        var token = normalize(json.code)
        var userCode = normalize(json.user_code)
        if (!token || !userCode) {
            Noty.show(Lang.translate('hook_online_filmix_auth_error'))
            return
        }
        openFilmixAuthModal(token, userCode, deviceId)
    }, function(a, c) {
        Noty.show(network.errorDecode(a, c))
    })
}

function checkFilmixAuth() {
    var token = getFilmixToken()
    if (!token) {
        Noty.show(Lang.translate('hook_online_filmix_auth_required'))
        return
    }
    requestFilmixUser(token, function(json) {
        if (!json || !json.ok) {
            Noty.show(extractErrorText(json) || Lang.translate('hook_online_filmix_auth_error'))
            return
        }
        if (!json.authorized) {
            Noty.show(Lang.translate('hook_online_filmix_auth_unauthorized'))
            return
        }
        setStoredFilmixMaxQuality(json.max_quality)
        SettingsApi.update()
        var quality = json.max_quality ? json.max_quality + 'p' : 'auto'
        Noty.show(Lang.translate('hook_online_filmix_auth_ok') + ' (' + quality + ')')
    }, function(text) {
        Noty.show(text || Lang.translate('hook_online_filmix_auth_error'))
    })
}

function resetFilmixAuth() {
    setFilmixToken('')
    setStoredFilmixMaxQuality(0)
    SettingsApi.update()
    Noty.show(Lang.translate('hook_online_filmix_auth_reset_done'))
}

// Sources Settings Modal
function buildSourcesList() {
    var sources = sourcesStore.available_sources
    if (!sources.length) {
        return $('<div class="settings-param-text">' + Lang.translate('hook_online_sources_empty') + '</div>')
    }
    var hidden = sourcesStore.getHidden()
    var sorted = sourcesStore.getSorted()
    var items = sources.map(function(item) {
        var key = sourcesStore.normalizeName(item.key || item.name)
        return {
            key: key,
            title: sourcesStore.getTitle(key),
            enabled: item.enabled !== false
        }
    }).filter(function(item) {
        return item.key && item.key !== 'hdrezka' && item.enabled
    })

    if (sorted.length) {
        var ordered = []
        sorted.forEach(function(key) {
            var found = items.find(function(item) { return item.key === key })
            if (found) ordered.push(found)
        })
        items.forEach(function(item) {
            if (sorted.indexOf(item.key) === -1) ordered.push(item)
        })
        items = ordered
    }

    var list = $('<div class="menu-edit-list"></div>')
    items.forEach(function(item) {
        var status_key = item.enabled ? 'hook_online_sources_enabled' : 'hook_online_sources_disabled'
        var status = Lang.translate(status_key)
        var row = $(`
            <div class="menu-edit-list__item hook-online-sources__item" data-key="${item.key}">
                <div class="menu-edit-list__title hook-online-sources__title selector">
                    <span class="hook-online-sources__name">${item.title || item.key}</span>
                    <span class="hook-online-sources__status ${item.enabled ? 'is-enabled' : 'is-disabled'}">${status}</span>
                </div>
                <div class="menu-edit-list__move move-up selector">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 12L11 3L20 12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="menu-edit-list__move move-down selector">
                    <svg width="22" height="14" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 2L11 11L20 2" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="menu-edit-list__toggle toggle selector">
                    <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1.89" y="1.78" width="21.79" height="21.79" rx="3.5" stroke="currentColor" stroke-width="3"/>
                        <path d="M7.45 12.97L10.82 16.33L18.13 9.03" stroke="currentColor" stroke-width="3" class="dot" opacity="0" stroke-linecap="round"/>
                    </svg>
                </div>
            </div>
        `)
        row.toggleClass('hidden', hidden.indexOf(item.key) !== -1)
        row.find('.dot').attr('opacity', row.hasClass('hidden') ? 0 : 1)
        row.find('.move-up').on('hover:enter', function() {
            var prev = row.prev()
            if (prev.length) row.insertBefore(prev)
        })
        row.find('.move-down').on('hover:enter', function() {
            var next = row.next()
            if (next.length) row.insertAfter(next)
        })
        row.find('.toggle').on('hover:enter', function() {
            row.toggleClass('hidden')
            row.find('.dot').attr('opacity', row.hasClass('hidden') ? 0 : 1)
        })
        list.append(row)
    })
    return list
}

function saveSourcesSettings(list) {
    var sort = []
    var hide = []
    list.find('.hook-online-sources__item').each(function() {
        var key = $(this).data('key')
        sort.push(key)
        if ($(this).hasClass('hidden')) hide.push(key)
    })
    sourcesStore.saveSorted(sort)
    sourcesStore.saveHidden(hide)
}

function resetPluginStorage() {
    Storage.set('HOOK_ONLINE_SOURCES_SORT', [])
    Storage.set('HOOK_ONLINE_SOURCES_HIDE', [])
    Storage.set('BO_SOURCES_SORT', [])
    Storage.set('BO_SOURCES_HIDE', [])
    SettingsApi.update()
    Noty.show(Lang.translate('hook_online_sources_reset_done'))
}

function openSourcesModal() {
    var wrapper = $('<div class="hook-online-sources"></div>')
    var list = null
    var actions = null
    var api_client = new APIClient()

    function buildActions() {
        var container = $('<div class="hook-online-sources__actions"></div>')
        var saveBtn = $('<div class="hook-online-sources__btn selector" data-action="save" title="' + Lang.translate('confirm') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>')
        var resetBtn = $('<div class="hook-online-sources__btn selector" data-action="reset" title="' + Lang.translate('reset') + '"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2C8.5 2 6 4.5 6 7.5c0 1.5.5 2.8 1.3 3.8L6 14l2.5 1.5c1 .8 2.2 1.2 3.5 1.2s2.5-.4 3.5-1.2L18 14l-1.3-2.7c.8-1 1.3-2.3 1.3-3.8C18 4.5 15.5 2 12 2z"/><circle cx="9.5" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="8" r="1.2" fill="currentColor" stroke="none"/><path d="M10 11h4v6c0 .6-.4 1-1 1h-2c-.6 0-1-.4-1-1v-6z"/></svg></div>')
        container.append(saveBtn).append(resetBtn)
        return container
    }

    function render() {
        list = buildSourcesList()
        if (!actions) actions = buildActions()
        wrapper.empty().append(actions).append(list)
    }

    function loadSources() {
        Loading.start()
        api_client.getSources(function(json) {
            if (json && json.ok && Array.isArray(json.sources)) {
                sourcesStore.saveAvailable(json.sources)
            }
            openModal()
        }, function() {
            openModal()
        })
    }

    function openModal() {
        Loading.stop()
        render()
        Modal.open({
            title: Lang.translate('hook_online_settings_sources'),
            html: wrapper,
            size: 'medium',
            scroll_to_center: true,
            select: wrapper.find('.menu-edit-list__item .selector').first()[0],
            onBack: function() {
                closeAndSave()
            }
        })
    }

    function closeAndSave() {
        if (list && list.hasClass('menu-edit-list')) saveSourcesSettings(list)
        Modal.close()
        Controller.toggle('settings_component')
    }

    wrapper.on('click hover:enter', '[data-action="save"]', closeAndSave)
    wrapper.on('click hover:enter', '[data-action="reset"]', function() {
        resetPluginStorage()
        render()
        Modal.update(wrapper)
    })

    loadSources()
}

function initSettings() {
    if (!SettingsApi || !SettingsApi.addComponent) return

    SettingsApi.addComponent({
        component: 'hook_online',
        name: Lang.translate('hook_online_settings_title'),
        icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" fill="currentColor"/></svg>'
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            name: 'hook_online_sources',
            type: 'button'
        },
        field: {
            name: Lang.translate('hook_online_settings_sources')
        },
        onChange: function() {
            openSourcesModal()
        }
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            type: 'title'
        },
        field: {
            name: 'Filmix'
        },
        onRender: function(item) {
            refreshFilmixTitle(item)
        }
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            name: 'hook_online_filmix_auth_start',
            type: 'button'
        },
        field: {
            name: Lang.translate('hook_online_filmix_auth_start')
        },
        onChange: function() {
            startFilmixAuthFlow()
        }
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            name: 'hook_online_filmix_auth_token',
            type: 'button'
        },
        field: {
            name: Lang.translate('hook_online_filmix_auth_token')
        },
        onRender: function(item) {
            setFilmixTokenButtonTitle(item)
        },
        onChange: function() {
            openFilmixTokenInput()
        }
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            name: 'hook_online_filmix_auth_check',
            type: 'button'
        },
        field: {
            name: Lang.translate('hook_online_filmix_auth_check')
        },
        onChange: function() {
            checkFilmixAuth()
        }
    })

    SettingsApi.addParam({
        component: 'hook_online',
        param: {
            name: 'hook_online_filmix_auth_reset',
            type: 'button'
        },
        field: {
            name: Lang.translate('hook_online_filmix_auth_reset')
        },
        onChange: function() {
            resetFilmixAuth()
        }
    })
}

function registerTemplates() {
    var templates = {
        hook_online_full: `
            <div class="online-prestige online-prestige--full selector">
                <div class="online-prestige__img">
                    <img alt="">
                    <div class="online-prestige__loader"></div>
                </div>
                <div class="online-prestige__body">
                    <div class="online-prestige__head">
                        <div class="online-prestige__title">{title}</div>
                        <div class="online-prestige__time">{time}</div>
                    </div>
                    <div class="online-prestige__timeline"></div>
                    <div class="online-prestige__footer">
                        <div class="online-prestige__info">{info}</div>
                        <div class="online-prestige__quality">{quality}</div>
                    </div>
                </div>
            </div>
        `,
        hook_online_does_not_answer: `
            <div class="online-empty">
                <div class="online-empty__title">#{online_balanser_dont_work}</div>
                <div class="online-empty__time">#{online_balanser_timeout}</div>
                <div class="online-empty__buttons">
                    <div class="online-empty__button selector cancel">#{cancel}</div>
                    <div class="online-empty__button selector change">#{online_change_balanser}</div>
                    <div class="online-empty__button selector search_all">#{hook_online_search_all}</div>
                </div>
                <div class="online-empty__templates">
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                    <div class="online-empty-template">
                        <div class="online-empty-template__ico"></div>
                        <div class="online-empty-template__body"></div>
                    </div>
                </div>
            </div>
        `,
        hook_online_rate: `
            <div class="online-prestige-rate">
                <svg width="17" height="16" viewBox="0 0 17 16" fill="currentColor">
                    <path d="M8.394 0.192L10.99 5.31L16.788 6.204L12.548 10.428L13.582 15.931L8.394 13.243L3.206 15.931L4.241 10.428L0 6.204L5.798 5.31L8.394 0.192Z"/>
                </svg>
                <span>{rate}</span>
            </div>
        `,
        hook_online_folder: `
            <div class="online-prestige online-prestige--folder selector">
                <div class="online-prestige__folder">
                    <svg viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect y="20" width="128" height="92" rx="13" fill="white"/>
                        <path d="M29.996 8H98.004C96.045 3.302 91.408 0 86 0H42C36.592 0 31.956 3.302 29.996 8Z" fill="white" fill-opacity="0.23"/>
                        <rect x="11" y="8" width="106" height="76" rx="13" fill="white" fill-opacity="0.51"/>
                    </svg>
                </div>
                <div class="online-prestige__body">
                    <div class="online-prestige__head">
                        <div class="online-prestige__title">{title}</div>
                        <div class="online-prestige__time">{time}</div>
                    </div>
                    <div class="online-prestige__footer">
                        <div class="online-prestige__info">{info}</div>
                    </div>
                </div>
            </div>
        `,
        hook_online_watched: `
            <div class="online-prestige online-prestige-watched selector">
                <div class="online-prestige-watched__icon">
                    <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10.5" cy="10.5" r="9" stroke="currentColor" stroke-width="2.5"/>
                        <path d="M14.85 10.56L8.2 14.4V6.73L14.85 10.56Z" fill="currentColor"/>
                    </svg>
                </div>
                <div class="online-prestige-watched__body"></div>
            </div>
        `
    }

    for (var key in templates) {
        Template.add(key, templates[key])
    }
}

function registerTranslations() {
    Lang.add({
        online_watch: {
            uk: 'Дивитися онлайн',
            en: 'Watch online',
            ro: 'Vizionare online',
            fr: 'Regarder en ligne',
            ru: 'Смотреть онлайн',
            zh: '在线观看'
        },
        online_no_watch_history: {
            uk: 'Немає історії перегляду',
            en: 'No browsing history',
            ro: 'Niciun istoric',
            fr: 'Aucun historique',
            ru: 'Нет истории просмотра',
            zh: '没有浏览历史'
        },
        online_video: {
            uk: 'Відео',
            en: 'Video',
            ro: 'Video',
            fr: 'Vidéo',
            ru: 'Видео',
            zh: '视频'
        },
        online_nolink: {
            uk: 'Неможливо отримати посилання',
            en: 'Failed to fetch link',
            ro: 'Nu s-a putut obține linkul',
            fr: 'Impossible d\'obtenir le lien',
            ru: 'Не удалось извлечь ссылку',
            zh: '获取链接失败'
        },
        online_balanser: {
            uk: 'Джерело',
            en: 'Source',
            ro: 'Sursă',
            fr: 'Source',
            ru: 'Источник',
            zh: '来源'
        },
        online_change_balanser: {
            uk: 'Змінити балансер',
            en: 'Change balancer',
            ro: 'Schimbă sursa',
            fr: 'Changer de serveur',
            ru: 'Изменить балансер',
            zh: '更改平衡器'
        },
        online_balanser_dont_work: {
            uk: 'Балансер ({balanser}) не відповідає на запит.',
            en: 'Balancer ({balanser}) does not respond.',
            ro: 'Sursa ({balanser}) nu răspunde.',
            fr: 'Le serveur ({balanser}) ne répond pas.',
            ru: 'Балансер ({balanser}) не отвечает на запрос.',
            zh: '平衡器（{balanser}）未响应。'
        },
        online_balanser_timeout: {
            uk: 'Балансер буде переключено автоматично через <span class="timeout">10</span> секунд.',
            en: 'Switching balancer automatically in <span class="timeout">10</span> seconds.',
            ro: 'Sursa se va schimba automat în <span class="timeout">10</span> secunde.',
            fr: 'Changement automatique dans <span class="timeout">10</span> secondes.',
            ru: 'Балансер будет переключен автоматически через <span class="timeout">10</span> секунд.',
            zh: '将在<span class="timeout">10</span>秒内自动切换。'
        },
        hook_online_settings_title: {
            uk: 'HOOK TV - Онлайн',
            en: 'HOOK TV - Online Sources',
            ro: 'HOOK TV - Surse Online',
            fr: 'HOOK TV - Sources en ligne',
            ru: 'HOOK TV - Онлайн'
        },
        hook_online_settings_sources: {
            uk: 'Джерела онлайн',
            en: 'Online sources',
            ro: 'Surse online',
            fr: 'Sources en ligne',
            ru: 'Источники онлайн'
        },
        hook_online_search_all: {
            uk: 'Пошук по всіх джерелах',
            en: 'Search all sources',
            ro: 'Caută în toate sursele',
            fr: 'Rechercher partout',
            ru: 'Поиск по всем источникам'
        },
        hook_online_sources_empty: {
            uk: 'Список джерел ще не синхронізований.',
            en: 'Sources list has not been synced yet.',
            ro: 'Lista de surse nu a fost încă sincronizată.',
            fr: 'La liste des sources n\'a pas encore été synchronisée.',
            ru: 'Список источников еще не синхронизирован.'
        },
        hook_online_sources_enabled: {
            uk: 'Увімкнено',
            en: 'Enabled',
            ro: 'Activat',
            fr: 'Activé',
            ru: 'Включено'
        },
        hook_online_sources_disabled: {
            uk: 'Вимкнено',
            en: 'Disabled',
            ro: 'Dezactivat',
            fr: 'Désactivé',
            ru: 'Отключено'
        },
        hook_online_sources_reset_done: {
            uk: 'Налаштування джерел скинуто',
            en: 'Sources settings reset',
            ro: 'Setările au fost resetate',
            fr: 'Paramètres réinitialisés',
            ru: 'Настройки источников сброшены'
        },
        hook_online_filmix_auth_start: {
            uk: 'Запустити Filmix авторизацію (код)',
            en: 'Start Filmix auth (code)',
            ro: 'Pornire autentificare Filmix (cod)',
            fr: 'Démarrer l\'authentification Filmix (code)',
            ru: 'Запустить Filmix авторизацию (код)'
        },
        hook_online_filmix_auth_token: {
            uk: 'Ввести Filmix token',
            en: 'Enter Filmix token',
            ro: 'Introdu token Filmix',
            fr: 'Entrer le jeton Filmix',
            ru: 'Ввести Filmix token'
        },
        hook_online_filmix_token_state_set: {
            uk: 'встановлено',
            en: 'set',
            ro: 'setat',
            fr: 'défini',
            ru: 'установлен'
        },
        hook_online_filmix_token_state_empty: {
            uk: 'не задано',
            en: 'not set',
            ro: 'nesetat',
            fr: 'non défini',
            ru: 'не задан'
        },
        hook_online_filmix_token_saved: {
            uk: 'Filmix token збережено',
            en: 'Filmix token saved',
            ro: 'Token Filmix salvat',
            fr: 'Jeton Filmix enregistré',
            ru: 'Filmix token сохранен'
        },
        hook_online_filmix_auth_check: {
            uk: 'Перевірити Filmix авторизацію',
            en: 'Check Filmix auth',
            ro: 'Verifică autentificarea Filmix',
            fr: 'Vérifier l\'authentification Filmix',
            ru: 'Проверить Filmix авторизацию'
        },
        hook_online_filmix_auth_reset: {
            uk: 'Скинути Filmix token',
            en: 'Reset Filmix token',
            ro: 'Resetează token Filmix',
            fr: 'Réinitialiser le jeton Filmix',
            ru: 'Сбросить Filmix token'
        },
        hook_online_filmix_auth_reset_done: {
            uk: 'Filmix token очищено',
            en: 'Filmix token cleared',
            ro: 'Token Filmix șters',
            fr: 'Jeton Filmix effacé',
            ru: 'Filmix token очищен'
        },
        hook_online_filmix_auth_required: {
            uk: 'Для Filmix потрібен token',
            en: 'Filmix token required',
            ro: 'Este necesar un token Filmix',
            fr: 'Jeton Filmix requis',
            ru: 'Для Filmix нужен token'
        },
        hook_online_filmix_auth_error: {
            uk: 'Помилка авторизації Filmix',
            en: 'Filmix auth error',
            ro: 'Eroare de autentificare Filmix',
            fr: 'Erreur d\'authentification Filmix',
            ru: 'Ошибка авторизации Filmix'
        },
        hook_online_filmix_auth_unauthorized: {
            uk: 'Filmix: неавторизовано',
            en: 'Filmix: unauthorized',
            ro: 'Filmix: neautorizat',
            fr: 'Filmix: non autorisé',
            ru: 'Filmix: не авторизован'
        },
        hook_online_filmix_auth_ok: {
            uk: 'Filmix: авторизація активна',
            en: 'Filmix: authorized',
            ro: 'Filmix: autorizat',
            fr: 'Filmix: connecté',
            ru: 'Filmix: авторизация активна'
        },
        hook_online_filmix_modal_title: {
            uk: 'Filmix авторизація',
            en: 'Filmix authorization',
            ro: 'Autentificare Filmix',
            fr: 'Authentification Filmix',
            ru: 'Filmix авторизация'
        },
        hook_online_filmix_modal_text: {
            uk: 'Введіть код на сторінці https://filmix.my/consoles',
            en: 'Enter this code at https://filmix.my/consoles',
            ro: 'Introduceți codul pe https://filmix.my/consoles',
            fr: 'Entrez ce code sur https://filmix.my/consoles',
            ru: 'Введите код на странице https://filmix.my/consoles'
        },
        hook_online_filmix_modal_wait: {
            uk: 'Очікуємо підтвердження...',
            en: 'Waiting for authorization...',
            ro: 'Se așteaptă confirmarea...',
            fr: 'En attente de confirmation...',
            ru: 'Ожидаем подтверждения...'
        },
        hook_online_filmix_modal_success: {
            uk: 'Авторизація підтверджена',
            en: 'Authorization confirmed',
            ro: 'Autentificare confirmată',
            fr: 'Authentification confirmée',
            ru: 'Авторизация подтверждена'
        },
        hook_online_filmix_modal_authorized: {
            uk: 'Filmix авторизацію збережено',
            en: 'Filmix auth saved',
            ro: 'Autentificare salvată',
            fr: 'Authentification enregistrée',
            ru: 'Filmix авторизация сохранена'
        }
    })
}

var initialized_service = false

function init() {
    if (initialized_service) return
    initialized_service = true

    window.hook_online = true

    Watch.register({ autoPlay: autoPlay, balancers: balancers })

    // Register components
    Component.add('hook_online', component)
    Component.add('online', component)
    Component.add('online_mod', component)

    registerTemplates()
    registerTranslations()
    initSettings()

    // Context menu on movie/series cards
    Manifest.plugins = {
        type: 'video',
        version: '1.0.0',
        name: 'HOOK TV Online',
        component: 'hook_online',
        onContextMenu: function(object) {
            return {
                name: Lang.translate('online_watch')
            }
        },
        onContextLauch: function(object) {
            Watch.start(object)
        }
    }
}

/**
 * Balancers that can play this title, in the user's order, for the player menu
 * @param {function({key:string, title:string}[])} call
 */
function balancers(movie, call) {
    autoSources(movie, function(keys) {
        var failed = unavailable[titleKey(movie)] || {}

        // a source that answered nothing for this title is not offered
        call(keys.filter(function(key) {
            return !failed[key]
        }).map(function(key) {
            return { key: key, title: sourcesStore.getTitle(key) }
        }))
    })
}

export default {
    init: init,
    component: component,
    autoPlay: autoPlay,
    balancers: balancers
}
