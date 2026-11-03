import Storage from '../core/storage/storage'
import SOURCE_CATALOG from './online_sources_catalog'

/**
 * Online sources: the list from the server, its order, and which sources the
 * user switched off. Until the server answers, the built-in catalog is shown.
 */
var SourcesStore = function() {
    function SourcesStore() {
        this.sources_key = 'HOOK_ONLINE_SOURCES'
        this.sources_sort_key = 'HOOK_ONLINE_SOURCES_SORT'
        this.sources_hide_key = 'HOOK_ONLINE_SOURCES_HIDE'

        var legacySources = Storage.get(this.sources_key, null) || Storage.get('BO_SOURCES', [])
        this.available_sources = Array.isArray(legacySources) ? legacySources : []
        this.titles = {}
        this.applyTitles(SOURCE_CATALOG)
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
    /** What the Settings list shows: the server's sources, or the built-in catalog */
    SourcesStore.prototype.settingsList = function() {
        return this.available_sources.length ? this.available_sources : SOURCE_CATALOG
    }
    SourcesStore.prototype.getQuality = function(key) {
        var found = SOURCE_CATALOG.find(function(item) { return item.key === key })
        return found && found.quality ? found.quality : ''
    }
    SourcesStore.prototype.defaultHidden = function() {
        return SOURCE_CATALOG.filter(function(item) { return item.off }).map(function(item) { return item.key })
    }
    SourcesStore.prototype.getSorted = function() {
        var sorted = Storage.get(this.sources_sort_key, null) || Storage.get('BO_SOURCES_SORT', [])
        return Array.isArray(sorted) ? sorted.map(this.normalizeName).filter(Boolean) : []
    }
    SourcesStore.prototype.getHidden = function() {
        var hidden = Storage.get(this.sources_hide_key, null) || Storage.get('BO_SOURCES_HIDE', null)
        // never saved yet: start from the catalog's default-off sources
        if (!Array.isArray(hidden)) return this.defaultHidden()
        return hidden.map(this.normalizeName).filter(Boolean)
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
    /**
     * Sources for the title sheet: switched-on ones first, each group in the user's order
     * @returns {{key:string, title:string, quality:string, active:boolean}[]}
     */
    SourcesStore.prototype.ordered = function() {
        var _this = this
        var hidden = this.getHidden()
        var sorted = this.getSorted()
        var list = this.settingsList().filter(function(item) {
            return item && item.enabled !== false
        }).map(function(item) {
            var key = _this.normalizeName(item.key || item.name)
            return {
                key: key,
                title: _this.getTitle(key),
                quality: _this.getQuality(key),
                active: hidden.indexOf(key) === -1
            }
        }).filter(function(item) {
            return item.key && item.key !== 'hdrezka'
        })
        return list.map(function(item, index) {
            return {item: item, index: index}
        }).sort(function(a, b) {
            if (a.item.active !== b.item.active) return a.item.active ? -1 : 1
            var ka = sorted.indexOf(a.item.key)
            var kb = sorted.indexOf(b.item.key)
            if (ka !== kb) return ka < 0 ? 1 : kb < 0 ? -1 : ka - kb
            return a.index - b.index
        }).map(function(entry) {
            return entry.item
        })
    }
    SourcesStore.prototype.getTitle = function(key) {
        return this.titles[this.normalizeName(key)] || key
    }
    return SourcesStore
}()

export default new SourcesStore()
