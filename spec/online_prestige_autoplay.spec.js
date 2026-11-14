import {describe, expect, it, vi} from 'vitest'
import AutoPlay from '../plugins/online_prestige/autoplay'

describe('Online Prestige automatic selection', ()=>{
    it('chooses the available provider result closest to the selected quality', ()=>{
        let results = [
            {title: 'Film 720p', quality: '720p'},
            {title: 'Film 4K', quality: '2160p'},
            {title: 'Film FHD', quality: '1080p'}
        ]

        expect(AutoPlay.best(results, 2160).item).toBe(results[1])
        expect(AutoPlay.best(results, 1080).item).toBe(results[2])
    })

    it('keeps the first result when provider metadata has no quality', ()=>{
        let first = {title: 'Film', quality: ''}

        expect(AutoPlay.best([first, {title: 'Film 720p'}], 1080).item).toBe(first)
    })

    it('rotates once through each provider and then reports exhaustion', ()=>{
        let keys = ['filmix', 'videocdn', 'rezka']

        expect(AutoPlay.next(keys, ['filmix'])).toBe('videocdn')
        expect(AutoPlay.next(keys, ['filmix', 'videocdn'])).toBe('rezka')
        expect(AutoPlay.next(keys, keys)).toBe(null)
    })

    it('waits for player canplay instead of treating a player create request as playback success', ()=>{
        const calls = []
        const player = eventBus()

        AutoPlay.watchPlayer(player, 20000, ()=>calls.push('started'), ()=>calls.push('failed'))
        player.listener.send('create')

        expect(calls).toEqual([])

        player.listener.send('canplay')
        expect(calls).toEqual(['started'])
    })

    it('fails over on fatal player errors and playback timeout', ()=>{
        vi.useFakeTimers()
        const errors = []
        const timeouts = []
        const failedPlayer = eventBus()
        const stalledPlayer = eventBus()

        AutoPlay.watchPlayer(failedPlayer, 20000, ()=>{}, ()=>errors.push('failed'))
        failedPlayer.listener.send('error', {fatal: true})
        AutoPlay.watchPlayer(stalledPlayer, 20000, ()=>{}, ()=>timeouts.push('timeout'))
        vi.advanceTimersByTime(20000)

        expect(errors).toEqual(['failed'])
        expect(timeouts).toEqual(['timeout'])
        vi.useRealTimers()
    })
})

function eventBus(){
    const listeners = {}

    return {
        listener: {
            follow: (name, callback)=>{
                (listeners[name] || (listeners[name] = [])).push(callback)
            },
            remove: (name, callback)=>{
                listeners[name] = (listeners[name] || []).filter(item=>item !== callback)
            },
            send: (name, value)=>{
                ;(listeners[name] || []).slice().forEach(callback=>callback(value))
            }
        }
    }
}
