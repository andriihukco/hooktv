import {describe, it, expect, vi} from 'vitest'
import {createMetadata} from '../src/core/tmdb/metadata'

function reply(body, ok = true, status = 200){
    return Promise.resolve({ok, status, json: ()=>Promise.resolve(body)})
}

describe('createMetadata.movie', () => {
    it('reads a movie by TMDB id with its IMDb id and language', async () => {
        let request = vi.fn(()=>reply({
            id: 27205, title: 'Inception', original_title: 'Inception', original_language: 'en',
            release_date: '2010-07-15', overview: 'A thief.', genres: [{id: 28, name: 'Action'}],
            runtime: 148, vote_average: 8.4, vote_count: 35000, poster_path: '/p.jpg',
            backdrop_path: '/b.jpg', external_ids: {imdb_id: 'tt1375666'}
        }))
        let meta  = createMetadata({key: 'k', fetch: request, language: 'uk-UA'})
        let movie = await meta.movie(27205)

        expect(request.mock.calls[0][0]).toContain('/3/movie/27205?')
        expect(request.mock.calls[0][0]).toContain('language=uk-UA')
        expect(request.mock.calls[0][0]).toContain('api_key=k')
        expect(movie).toEqual({
            id: 27205, kind: 'movie', title: 'Inception', original_title: 'Inception',
            original_language: 'en', year: 2010, overview: 'A thief.', genres: ['Action'],
            runtime: 148, seasons: 0, rating: 8.4, votes: 35000, poster: '/p.jpg',
            backdrop: '/b.jpg', imdb_id: 'tt1375666'
        })
    })
})

describe('createMetadata.series', () => {
    it('reads a show by TMDB id using its own field names', async () => {
        let request = vi.fn(()=>reply({
            id: 1396, name: 'Breaking Bad', original_name: 'Breaking Bad', original_language: 'en',
            first_air_date: '2008-01-20', episode_run_time: [47], number_of_seasons: 5,
            genres: [], vote_average: 8.9, vote_count: 10000, external_ids: {imdb_id: 'tt0903747'}
        }))
        let show = await createMetadata({key: 'k', fetch: request}).series(1396)

        expect(request.mock.calls[0][0]).toContain('/3/tv/1396?')
        expect(request.mock.calls[0][0]).toContain('append_to_response=external_ids')
        expect(show.title).toBe('Breaking Bad')
        expect(show.kind).toBe('series')
        expect(show.year).toBe(2008)
        expect(show.runtime).toBe(47)
        expect(show.seasons).toBe(5)
        expect(show.imdb_id).toBe('tt0903747')
    })
})

describe('createMetadata caching and errors', () => {
    it('serves a repeated lookup from cache', async () => {
        let request = vi.fn(()=>reply({id: 1, title: 'x', external_ids: {}}))
        let meta    = createMetadata({key: 'k', fetch: request})

        await meta.movie(1)
        await meta.movie(1)

        expect(request).toHaveBeenCalledTimes(1)
    })

    it('rejects on a failed TMDB response and does not cache it', async () => {
        let request = vi.fn()
            .mockImplementationOnce(()=>reply({}, false, 404))
            .mockImplementationOnce(()=>reply({id: 9, title: 'ok', external_ids: {}}))
        let meta = createMetadata({key: 'k', fetch: request})

        await expect(meta.movie(9)).rejects.toThrow('TMDB 404')
        expect((await meta.movie(9)).title).toBe('ok')
        expect(request).toHaveBeenCalledTimes(2)
    })
})

describe('createMetadata.search', () => {
    it('returns normalized results and passes the year hint to the right field', async () => {
        let request = vi.fn(()=>reply({results: [{id: 5, name: 'Dark', first_air_date: '2017-12-01', original_language: 'de'}]}))
        let meta    = createMetadata({key: 'k', fetch: request})
        let found   = await meta.search('Dark', 'series', 2017)

        expect(request.mock.calls[0][0]).toContain('/3/search/tv?')
        expect(request.mock.calls[0][0]).toContain('first_air_date_year=2017')
        expect(found).toHaveLength(1)
        expect(found[0]).toMatchObject({id: 5, kind: 'series', title: 'Dark', year: 2017})
    })

    it('searches movies by year and returns an empty list when TMDB has none', async () => {
        let request = vi.fn(()=>reply({}))
        let found   = await createMetadata({key: 'k', fetch: request}).search('Nothing', 'movie', 1999)

        expect(request.mock.calls[0][0]).toContain('/3/search/movie?')
        expect(request.mock.calls[0][0]).toContain('year=1999')
        expect(found).toEqual([])
    })
})
