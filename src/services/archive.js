import Reguest from '../utils/reguest'
import Player from '../interaction/player'
import Timeline from '../interaction/timeline'
import Utils from '../utils/utils'

/**
 * HOOK TV: Internet Archive fallback. The «feature_films» collection is
 * curated public-domain cinema with direct MP4 files and open CORS, so it
 * needs no key and no backend. Movies only, matched by title and year.
 */

let api = 'https://archive.org'

function getYear(movie){
    let date = movie.release_date || movie.year || ''

    return parseInt((date + '').slice(0, 4)) || 0
}

function clean(title){
    return (title || '').toString().replace(/["()\[\]:\\]/g, ' ').replace(/\s+/g, ' ').trim()
}

function same(a, b){
    let norm = (t)=>clean(t).toLowerCase().replace(/^the\s+/, '').replace(/[\s\-.,!?'’&]+/g, '')

    return norm(a) && norm(a) == norm(b)
}

function search(network, movie, year, success, fail){
    let title = clean(movie.original_title || movie.title)
    let query = 'title:("' + title + '") AND mediatype:movies AND collection:feature_films'
    let url   = api + '/advancedsearch.php?q=' + encodeURIComponent(query) + '&fl[]=identifier&fl[]=title&fl[]=year&sort[]=downloads+desc&rows=10&output=json'

    network.silent(url, (json)=>{
        let docs = json && json.response && json.response.docs || []
        let doc  = docs.find(d=>(same(d.title, movie.original_title) || same(d.title, movie.title)) && (!year || !d.year || Math.abs(parseInt(d.year) - year) <= 1))

        doc ? success(doc.identifier) : fail('no match')
    }, ()=>fail('search failed'))
}

function pickFile(json){
    let files = json && json.files || []
    // only MP4 plays in every TV browser; uploads also carry MKV, M2TS and OGV
    let mp4   = files.filter(f=>/\.mp4$/i.test(f.name) && !/512kb/i.test(f.format || ''))
    // the archive's own «h.264» encode is web-safe; an uploaded original may not decode
    let safe  = (f)=>f.source == 'derivative' && f.format == 'h.264' ? 1 : 0

    // then the tallest, then the biggest: a full copy, not a sample or one DVD chapter
    mp4.sort((a, b)=>safe(b) - safe(a) || (parseInt(b.height) || 0) - (parseInt(a.height) || 0) || (parseInt(b.size) || 0) - (parseInt(a.size) || 0))

    return mp4[0]
}

/**
 * Same contract as the online probes: resolves to {key, play} or null
 * @param {object} movie TMDB card
 * @returns {Promise}
 */
function probe(movie){
    return new Promise((resolve)=>{
        let year = getYear(movie)

        // the collection holds feature films only; without a year the match is a guess
        if(movie.name || !year) return resolve(null)

        let network = new Reguest()
        let timer   = setTimeout(()=>{
            network.clear()
            resolve(null)
        }, 8000)

        let skip = (why)=>{
            clearTimeout(timer)
            console.log('Watch', 'archive', 'skip', why)
            resolve(null)
        }

        search(network, movie, year, (id)=>{
            network.silent(api + '/metadata/' + encodeURIComponent(id), (json)=>{
                let file = pickFile(json)

                if(!file) return skip('no mp4')

                clearTimeout(timer)

                resolve({
                    key: 'archive',
                    play: (success)=>{
                        Player.play({
                            url: api + '/download/' + encodeURIComponent(id) + '/' + file.name.split('/').map(encodeURIComponent).join('/'),
                            title: movie.title || movie.original_title,
                            timeline: Timeline.view(Utils.hash(movie.original_title || movie.title))
                        })
                        Player.playlist([])

                        success()
                    }
                })
            }, ()=>skip('metadata failed'))
        }, skip)
    })
}

export default {
    probe
}
