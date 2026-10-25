import {describe, it, expect, vi} from 'vitest'

vi.mock('../src/interaction/select', ()=>({default: {}}))
vi.mock('../src/core/controller', ()=>({default: {}}))
vi.mock('../src/core/lang', ()=>({default: {translate: (k)=>k}}))
vi.mock('../src/core/platform', ()=>({default: {is: ()=>false}}))
vi.mock('../src/core/android', ()=>({default: {}}))

import WhereToWatch from '../src/interaction/where_to_watch'

describe('WhereToWatch.available', () => {
    it('lists subscriptions first and each service once', () => {
        let found = {
            rent:     [{provider_id: 2, provider_name: 'Apple TV Store'}, {provider_id: 35, provider_name: 'Rakuten TV'}],
            buy:      [{provider_id: 2, provider_name: 'Apple TV Store'}],
            flatrate: [{provider_id: 1899, provider_name: 'HBO Max'}]
        }

        expect(WhereToWatch.available(found).map(p=>p.name + ' ' + p.label)).toEqual([
            'HBO Max hooktv_where_subscription',
            'Apple TV hooktv_where_rent',
            'Rakuten TV hooktv_where_rent'
        ])
    })

    it('is empty when nothing is offered', () => {
        expect(WhereToWatch.available({link: 'x'})).toEqual([])
    })
})

describe('WhereToWatch.rows', () => {
    let movie = {title: 'Початок', original_title: 'Inception', original_language: 'en'}
    let found = {link: 'https://tmdb/watch', flatrate: [{provider_id: 1899, provider_name: 'HBO Max'}]}
    let rows  = WhereToWatch.rows(movie, found, 'Inception')
    let named = (name)=>rows.find(r=>r.title == name && !r.separator)

    it('searches Ukrainian services by the card title and international ones in English', () => {
        expect(named('Megogo').url).toContain('q=' + encodeURIComponent('Початок'))
        expect(named('Netflix').url).toBe('https://www.netflix.com/search?q=Inception')
        expect(named('HBO Max').url).toBe('https://play.hbomax.com/search?q=Inception')
    })

    it('lists a service once, under where it streams', () => {
        expect(rows.filter(r=>r.title == 'HBO Max')).toHaveLength(1)
        expect(named('HBO Max').subtitle).toBe('hooktv_where_subscription')
    })

    it('says which services are not sold in Ukraine', () => {
        expect(named('Hulu').subtitle).toBe('hooktv_where_us_only')
        expect(named('Disney+').subtitle).toBe('hooktv_where_not_ua')
    })

    it('offers no manual source list and Takflix only for Ukrainian films', () => {
        expect(rows.some(r=>r.sources)).toBe(false)
        expect(named('Takflix')).toBeUndefined()
        expect(WhereToWatch.rows({...movie, original_language: 'uk'}, null, 'x').some(r=>r.title == 'Takflix')).toBe(true)
    })
})

