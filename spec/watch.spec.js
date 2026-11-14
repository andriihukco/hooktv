import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(()=>({
    controller: {toggle: vi.fn()},
    storage: {get: vi.fn(()=>''), field: vi.fn(()=>2160)},
    manifest: {plugins: []},
    activity: {backward: vi.fn()},
    loading: {watch: vi.fn(), destroy: vi.fn(), zoom: vi.fn()},
    where: {show: vi.fn()},
    torrent: {search: vi.fn(), preferred: vi.fn(), best: vi.fn(), play: vi.fn(), show: vi.fn()},
    online: {autoPlay: vi.fn(), balancers: vi.fn()},
    player: {balancers: vi.fn()},
    noty: {show: vi.fn()},
    events: []
}))

vi.mock('../src/core/controller', ()=>({default: mocks.controller}))
vi.mock('../src/core/storage/storage', ()=>({default: mocks.storage}))
vi.mock('../src/core/manifest', ()=>({default: mocks.manifest}))
vi.mock('../src/interaction/activity/activity', ()=>({default: mocks.activity}))
vi.mock('../src/core/lang', ()=>({default: {translate: (key)=>key}}))
vi.mock('../src/interaction/loading_progress', ()=>({default: mocks.loading}))
vi.mock('../src/interaction/where_to_watch', ()=>({default: mocks.where}))
vi.mock('../src/interaction/torrent_fallback', ()=>({default: mocks.torrent}))
vi.mock('../src/interaction/player', ()=>({default: mocks.player}))
vi.mock('../src/interaction/noty', ()=>({default: mocks.noty}))
vi.mock('../src/utils/dub', ()=>({default: {defaultAudio: ()=> 'uk'}}))

import Watch from '../src/interaction/watch'

describe('Watch.start', ()=>{
    let movie = {id: 1, title: 'Film'}
    let torrent = {Title: 'Film UHD', MagnetUri: 'magnet:4k'}

    beforeEach(()=>{
        vi.clearAllMocks()
        mocks.events.length = 0
        mocks.storage.field.mockReturnValue(2160)
        mocks.storage.get.mockReturnValue('uk')
        mocks.manifest.plugins = []
        mocks.torrent.search.mockImplementation((card, done)=>{
            mocks.events.push('torrent-search')
            done([torrent])
        })
        mocks.torrent.preferred.mockReturnValue(torrent)
        mocks.torrent.best.mockReturnValue(torrent)
        mocks.torrent.play.mockImplementation(()=>mocks.events.push('torrent-play'))
        mocks.online.autoPlay.mockImplementation(()=>mocks.events.push('online'))
        Watch.register(mocks.online)
    })

    it('starts a selected-quality torrent before probing online sources', ()=>{
        Watch.start(movie)

        expect(mocks.events).toEqual(['torrent-search', 'torrent-play'])
        expect(mocks.torrent.search).toHaveBeenCalledWith(movie, expect.any(Function), 2160)
        expect(mocks.online.autoPlay).not.toHaveBeenCalled()
    })

    it('opens the bundled rotating online plugin after HOOK TV adapters fail', ()=>{
        mocks.torrent.preferred.mockReturnValue(null)
        mocks.online.autoPlay.mockImplementation((card, language, done)=>{
            mocks.events.push('online')
            done(false)
        })
        let open = vi.fn(options=>mocks.events.push('legacy-online'))
        mocks.manifest.plugins = [{component: 'online_prestige', hooktv_watch_adapter: 'online_prestige', onContextLauch: open}]

        Watch.start(movie)

        expect(mocks.events).toEqual(['torrent-search', 'online', 'legacy-online'])
        expect(open).toHaveBeenCalledWith(expect.objectContaining({
            hooktv_auto_watch: true,
            hooktv_auto_watch_quality: 2160,
            hooktv_auto_watch_audio: 'uk',
            hooktv_auto_watch_on_start: expect.any(Function),
            hooktv_auto_watch_on_fail: expect.any(Function)
        }))
        expect(mocks.torrent.best).not.toHaveBeenCalled()
    })

    it('does not pass HOOK TV autoplay controls to an unadapted plugin with the same component name', ()=>{
        mocks.torrent.preferred.mockReturnValue(null)
        mocks.online.autoPlay.mockImplementation((card, language, done)=>done(false))
        let external = vi.fn()
        mocks.manifest.plugins = [{component: 'online_prestige', onContextLauch: external}]

        Watch.start(movie)

        expect(external).not.toHaveBeenCalled()
        expect(mocks.torrent.play).toHaveBeenCalledWith(torrent, movie, 'content')
    })

    it('uses the best torrent after every bundled online provider fails', ()=>{
        mocks.torrent.preferred.mockReturnValue(null)
        mocks.online.autoPlay.mockImplementation((card, language, done)=>done(false))
        mocks.manifest.plugins = [{component: 'online_prestige', hooktv_watch_adapter: 'online_prestige', onContextLauch: vi.fn()}]

        Watch.start(movie)
        let options = mocks.manifest.plugins[0].onContextLauch.mock.calls[0][0]
        options.hooktv_auto_watch_on_fail()

        expect(mocks.activity.backward).toHaveBeenCalled()
        expect(mocks.torrent.best).toHaveBeenCalledWith([torrent], 2160)
        expect(mocks.torrent.play).toHaveBeenCalledWith(torrent, movie, 'content')
    })

    it('opens only streaming services when neither source path can play', ()=>{
        mocks.torrent.search.mockImplementation((card, done)=>done([]))
        mocks.torrent.preferred.mockReturnValue(null)
        mocks.torrent.best.mockReturnValue(null)
        mocks.online.autoPlay.mockImplementation((card, language, done)=>done(false))
        mocks.manifest.plugins = []

        Watch.start(movie)

        expect(mocks.where.show).toHaveBeenCalledWith(movie, 'content')
        expect(mocks.torrent.show).not.toHaveBeenCalled()
    })
})
