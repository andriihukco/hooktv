import {describe, it, expect, vi} from 'vitest'

vi.mock('../src/core/storage/storage', ()=>({default: {get: (k, d)=>d}}))

import weather from '../src/interaction/screensaver/weather'

describe('screensaver weather strip', () => {
    it('maps WMO codes to icon kinds', () => {
        expect(weather.kind(0)).toBe('sun')
        expect(weather.kind(2)).toBe('cloud')
        expect(weather.kind(45)).toBe('cloud')
        expect(weather.kind(61)).toBe('rain')
        expect(weather.kind(82)).toBe('rain')
        expect(weather.kind(73)).toBe('snow')
        expect(weather.kind(86)).toBe('snow')
        expect(weather.kind(95)).toBe('storm')
    })

    it('starts at the current hour in the forecast timezone and keeps 24 hours', () => {
        let now = Date.parse('2026-10-29T14:20:00Z')
        let spy = vi.spyOn(Date, 'now').mockReturnValue(now)

        let times = []
        let temps = []
        let codes = []

        for(let h = 0; h < 48; h++){
            times.push(`2026-10-29T${String(h % 24).padStart(2, '0')}:00`)
            temps.push(h)
            codes.push(0)
        }

        // utc_offset 2h: local time is 16:20, so the first hour is 16:00 (index 16)
        let list = weather.hours({utc_offset_seconds: 7200, hourly: {time: times, temperature_2m: temps, weather_code: codes}})

        spy.mockRestore()

        expect(list.length).toBe(24)
        expect(list[0]).toEqual({hour: 16, temp: 16, kind: 'sun'})
        expect(list[23].hour).toBe(15)
    })
})
