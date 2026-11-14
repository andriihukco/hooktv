import {describe, expect, it} from 'vitest'
import VideoQuality from '../src/utils/video_quality'

describe('video quality preference', ()=>{
    it('recognizes common source and torrent labels', ()=>{
        expect(VideoQuality.resolution('UHD remux')).toBe(2160)
        expect(VideoQuality.resolution('FHD')).toBe(1080)
        expect(VideoQuality.resolution('720p')).toBe(720)
        expect(VideoQuality.resolution('SD')).toBe(480)
    })

    it('prefers the selected resolution, then lower resolutions, and finally higher ones', ()=>{
        expect(VideoQuality.rank('FHD', 1080)).toBeLessThan(VideoQuality.rank('HD', 1080))
        expect(VideoQuality.rank('HD', 1080)).toBeLessThan(VideoQuality.rank('4K', 1080))
        expect(VideoQuality.rank('', 1080)).toBeGreaterThan(VideoQuality.rank('4K', 1080))
    })
})
