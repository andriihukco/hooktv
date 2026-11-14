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

    it('lists where the title streams first, each service once', () => {
        expect(rows[1].title).toBe('HBO Max')
        expect(rows.filter(r=>r.title == 'HBO Max')).toHaveLength(1)
        expect(named('HBO Max').subtitle).toBe('hooktv_where_subscription')
        expect(named('HBO Max').url).toBe('https://play.hbomax.com/search?q=Inception')
    })

    it('does not mix online playback adapters into the streaming services panel', () => {
        expect(rows.some(r=>r.source)).toBe(false)
        expect(rows.some(r=>r.title == 'hook_online_settings_sources')).toBe(false)
    })

    it('has no search-everywhere block at the end', () => {
        expect(rows.some(r=>r.title == 'hooktv_where_search')).toBe(false)
        expect(rows.some(r=>r.title == 'Netflix')).toBe(false)
        expect(rows[rows.length - 1].title).toBe('Sweet.tv')
    })
})

describe('WhereToWatch.rows: always-listed services', () => {
    let movie = {title: 'Початок', original_title: 'Inception', original_language: 'en'}
    let rows  = WhereToWatch.rows(movie, {link: 'https://tmdb/watch', flatrate: []}, 'Inception')

    it('lists Megogo and Sweet.tv with a link even when TMDB has no match', () => {
        expect(rows.find(r=>r.title == 'Megogo').url).toBe('https://megogo.net/ua')
        expect(rows.find(r=>r.title == 'Sweet.tv').url).toBe('https://sweet.tv/ua-en')
    })

    it('keeps each always-listed service once when TMDB also lists it', () => {
        let withTmdb = WhereToWatch.rows(movie, {link: 'x', flatrate: [{provider_id: 999, provider_name: 'Megogo'}]}, 'Inception')

        expect(withTmdb.filter(r=>r.title == 'Megogo')).toHaveLength(1)
    })
})
