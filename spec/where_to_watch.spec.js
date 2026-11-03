import {describe, it, expect, vi} from 'vitest'

vi.mock('../src/interaction/select', ()=>({default: {}}))
vi.mock('../src/core/controller', ()=>({default: {}}))
vi.mock('../src/core/lang', ()=>({default: {translate: (k)=>k}}))
vi.mock('../src/core/platform', ()=>({default: {is: ()=>false}}))
vi.mock('../src/core/android', ()=>({default: {}}))
vi.mock('../src/services/online_sources_store', ()=>({
    default: {
        ordered: ()=>[
            {key: 'kodik', title: 'kodik', quality: 'FHD', active: true},
            {key: 'vibix', title: 'vibix', quality: '', active: true},
            {key: 'krasview', title: 'krasview', quality: 'FHD', active: false}
        ]
    }
}))

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

    it('lists the HOOK TV sources after them, in the order from the store', () => {
        let sources = rows.filter(r=>r.source)

        expect(sources.map(r=>r.source)).toEqual(['kodik', 'vibix', 'krasview'])
        expect(sources[0].title).toBe('kodik · FHD')
        expect(sources[1].title).toBe('vibix')
        expect(rows.indexOf(sources[0])).toBeGreaterThan(rows.indexOf(named('HBO Max')))
    })

    it('marks each source by its switch: on first, off after', () => {
        expect(rows.find(r=>r.source == 'krasview').subtitle).toBe('hook_online_sources_disabled')
        expect(rows.find(r=>r.source == 'kodik').subtitle).toBe('hook_online_sources_enabled')
    })

    it('has no search-everywhere block at the end', () => {
        expect(rows.some(r=>r.title == 'hooktv_where_search')).toBe(false)
        expect(rows.some(r=>r.title == 'Netflix')).toBe(false)
        expect(rows[rows.length - 1].source).toBe('krasview')
    })
})
