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
