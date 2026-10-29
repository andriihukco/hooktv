import Storage from '../../core/storage/storage'

/**
 * Screensaver weather is provided by Open-Meteo and needs no API key.
 */

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

function condition(code){
    if(code === 0) return 'screensaver_weather_clear'
    if(code >= 95) return 'screensaver_weather_storm'
    if((code >= 70 && code <= 77) || (code >= 85 && code <= 86)) return 'screensaver_weather_snow'
    if((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'screensaver_weather_rain'
    if(code === 45 || code === 48) return 'screensaver_weather_fog'

    return 'screensaver_weather_cloudy'
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

async function json(url){
    let response = await fetch(url)

    if(!response.ok) throw new Error(`Weather request failed (${response.status})`)

    return response.json()
}

async function load(city = 'Kyiv'){
    let query = city.trim() || 'Kyiv'
    let geocode = new URL('https://geocoding-api.open-meteo.com/v1/search')

    geocode.search = new URLSearchParams({
        name: query,
        count: '1',
        language: 'en',
        format: 'json'
    })

    let locations = await json(geocode.toString())
    let location = locations.results && locations.results[0]

    if(!location) throw new Error(`No weather location found for "${query}"`)

    let forecast = new URL('https://api.open-meteo.com/v1/forecast')

    forecast.search = new URLSearchParams({
        latitude: location.latitude,
        longitude: location.longitude,
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
        hourly: 'temperature_2m,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
        forecast_days: '1',
        timezone: 'auto'
    })

    let data = await json(forecast.toString())

    return {
        city: [location.name, location.admin1].filter(Boolean).join(', '),
        current: data.current,
        daily: data.daily,
        hours: hours(data)
    }
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
    load,
    render,
    kind,
    hours,
    condition,
    icon: code => icons[kind(code)]
}
