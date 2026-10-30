import { describe, it, expect } from 'vitest'
import Dub from '../src/utils/dub.js'

describe('Dub.defaultAudio', () => {
    it('starts on Ukrainian for a Ukrainian interface, English otherwise', () => {
        expect(Dub.defaultAudio('uk')).toBe('uk')
        expect(Dub.defaultAudio('en')).toBe('original')
        expect(Dub.defaultAudio('ru')).toBe('original')
        expect(Dub.defaultAudio()).toBe('original')
    })
})

describe('Dub.playableTracks', () => {
    it('hides Russian and unnamed audio from the player menu', () => {
        let tracks = [
            {label: 'Українська', language: 'uk'},
            {label: 'Русский', language: 'ru'},
            {label: 'English', language: 'en'},
            {}
        ]

        expect(Dub.playableTracks(tracks).map(t=>t.label)).toEqual(['Українська', 'English'])
    })

    it('keeps the same objects so the saved track index still points at them', () => {
        let track = {name: 'Ukrainian'}

        expect(Dub.playableTracks([track])[0]).toBe(track)
    })
})
