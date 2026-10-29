/**
 * Readable title URLs: /movie/1101412-the-movie-title and /tv/1399-game-of-thrones.
 * Only the number is read back; the words are for people and search engines.
 *
 * The server copy of this logic is api/_slug.js; spec/slug.spec.js keeps them equal.
 */

const LETTERS = {
    а:'a', б:'b', в:'v', г:'h', ґ:'g', д:'d', е:'e', є:'ye', ж:'zh', з:'z', и:'y', і:'i', ї:'yi', й:'y', к:'k', л:'l', м:'m',
    н:'n', о:'o', п:'p', р:'r', с:'s', т:'t', у:'u', ф:'f', х:'kh', ц:'ts', ч:'ch', ш:'sh', щ:'shch', ь:'', ю:'yu', я:'ya',
    ы:'y', э:'e', ъ:'', ё:'yo'
}

const MAX = 60

function slug(text){
    let out = String(text || '').toLowerCase().replace(/[Ѐ-ӿ]/g, c => LETTERS[c] !== undefined ? LETTERS[c] : '')

    out = out.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

    if(out.length > MAX) out = out.slice(0, MAX).replace(/-[^-]*$/, '')

    return out
}

/** /movie/123-title, with ?source= only when it is not TMDB */
function cardPath(media, id, name, source){
    let path = '/' + (media == 'tv' ? 'tv' : 'movie') + '/' + id
    let words = slug(name)

    if(words) path += '-' + words

    return path + (source && source != 'tmdb' ? '?source=' + encodeURIComponent(source) : '')
}

/** the title behind a pathname, or null when it is not a title page */
function parseCardPath(pathname){
    let m = /^\/(movie|tv)\/(\d{1,12})(?:-[^/]*)?\/?$/.exec(pathname || '')

    return m ? {media: m[1], id: m[2]} : null
}

export default {slug, cardPath, parseCardPath}
