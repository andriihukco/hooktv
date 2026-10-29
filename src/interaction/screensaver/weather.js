import Storage from '../../core/storage/storage'

/**
 * HOOK TV screensaver: the next 24 hours of weather for Kyiv, from Open-Meteo (no key needed)
 */

const url = 'https://api.open-meteo.com/v1/forecast?latitude=50.45&longitude=30.52&hourly=temperature_2m,weather_code&timezone=auto'

const cloud = 'M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 14z'

const icons = {
    sun:   '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    cloud: `<path d="${cloud}"/>`,
    rain:  `<path d="${cloud}"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>`,
    snow:  `<path d="${cloud}"/><path d="M8 18v.01M12 18v.01M16 18v.01"/>`,
    storm: `<path d="${cloud}"/><path d="M12 14l-2 4h3l-2 4"/>`
}

// WMO weather codes: 0-1 clear, 2-3 and fog cloudy, 51+ drizzle and rain, 70+ snow, 95+ storm
function kind(code){
    if(code <= 1) return 'sun'
    if(code >= 95) return 'storm'
    if((code >= 70 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'
    if(code >= 51) return 'rain'

    return 'cloud'
}

// the 24 hours from the current one, in the forecast's own timezone
function hours(data){
    let now   = new Date(Date.now() + data.utc_offset_seconds * 1000).toISOString().slice(0, 13)
    let start = data.hourly.time.findIndex(t => t.slice(0, 13) >= now)

    if(start < 0) return []

    return data.hourly.time.slice(start, start + 24).map((t, i) => ({
        hour: +t.slice(11, 13),
        temp: Math.round(data.hourly.temperature_2m[start + i]),
        kind: kind(data.hourly.weather_code[start + i])
    }))
}

function render(list){
    let uk = Storage.get('language', 'uk') != 'en'

    return list.map((h, i) => `<div class="screensaver__weather-hour">
        <span class="screensaver__weather-time">${i ? String(h.hour).padStart(2, '0') : (uk ? 'Зараз' : 'Now')}</span>
        <svg viewBox="0 0 24 24">${icons[h.kind]}</svg>
        <span class="screensaver__weather-temp">${h.temp}°</span>
    </div>`).join('')
}

export default {
    load: () => fetch(url).then(r => r.json()).then(hours),
    render,
    kind,
    hours
}
