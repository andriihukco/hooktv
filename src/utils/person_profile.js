/**
 * HOOK TV person profile: what the page says about someone and how their
 * work is grouped. Pure functions over TMDB data, so the rules are testable.
 *
 * Rows, in order: Known for (their most-watched work in what they are known
 * for), Movies, Series, Coming soon, then directing / writing / production
 * and the rest of the crew work, and last the appearances as themselves.
 */

// TMDB tv genres that are shows about people rather than roles: news, reality, talk
const SHOW_GENRES = [10763, 10764, 10767]

// departments in the order a profile reads best, with the label keys for them
const DEPARTMENTS = [
    ['Directing', 'hooktv_person_directing'],
    ['Writing', 'hooktv_person_writing'],
    ['Creator', 'hooktv_person_creator'],
    ['Production', 'hooktv_person_production'],
    ['Sound', 'hooktv_person_sound'],
    ['Camera', 'hooktv_person_camera'],
    ['Editing', 'hooktv_person_editing'],
    ['Art', 'hooktv_person_art'],
    ['Visual Effects', 'hooktv_person_vfx'],
    ['Costume & Make-Up', 'hooktv_person_costume'],
    ['Lighting', 'hooktv_person_lighting'],
    ['Crew', 'hooktv_person_crew']
]

const ROLE = {
    Acting: 'hooktv_person_role_acting',
    Directing: 'hooktv_person_role_directing',
    Writing: 'hooktv_person_role_writing',
    Production: 'hooktv_person_role_production',
    Creator: 'hooktv_person_role_creator',
    Sound: 'hooktv_person_role_sound',
    Camera: 'hooktv_person_role_camera',
    Editing: 'hooktv_person_role_editing'
}

function date(credit){
    return credit.release_date || credit.first_air_date || ''
}

function time(credit){
    let t = Date.parse(date(credit))

    return isNaN(t) ? 0 : t
}

/**
 * Full years between two dates; to the death date when there is one
 * @param {string} birthday YYYY-MM-DD
 * @param {string} [deathday]
 * @param {Date} [now]
 * @returns {number|null}
 */
function age(birthday, deathday, now = new Date()){
    let born = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthday || '')

    if(!born) return null

    let end = deathday ? new Date(deathday + 'T00:00:00') : now

    if(isNaN(end.getTime())) return null

    let years = end.getFullYear() - born[1]
    let month = end.getMonth() + 1 - born[2]

    if(month < 0 || (month == 0 && end.getDate() < born[3])) years--

    return years >= 0 && years < 130 ? years : null
}

/**
 * «51 рік» / «51 years»
 * @param {number} n
 * @param {string} code interface language
 */
function ageText(n, code){
    if(code == 'uk' || code == 'ru' || code == 'be'){
        let forms = code == 'uk' ? ['рік', 'роки', 'років'] : code == 'be' ? ['год', 'гады', 'гадоў'] : ['год', 'года', 'лет']
        let mod10 = n % 10
        let mod100 = n % 100
        let form = mod10 == 1 && mod100 != 11 ? 0 : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20) ? 1 : 2

        return n + ' ' + forms[form]
    }

    return n + (n == 1 ? ' year' : ' years')
}

/**
 * Playing themselves: a talk show, the news, a making-of
 */
function isSelf(credit){
    if(/^(self|himself|herself|themselves|narrator|host|voice of self)\b/i.test(credit.character || '')) return true
    if(credit.media_type == 'tv' && (credit.genre_ids || []).some(g=>SHOW_GENRES.indexOf(g) >= 0)) return true

    return false
}

// a title is listed once per row, however many jobs the person had on it
function unique(list){
    let seen = {}

    return list.filter(credit=>{
        let key = credit.media_type + credit.id

        if(seen[key]) return false

        seen[key] = true

        return true
    })
}

function upcoming(credit, today){
    let t = time(credit)

    return t ? t > today : !credit.vote_count
}

// newest first; titles with no date at all go last
function byDate(list){
    return list.slice().sort((a, b)=>time(b) - time(a))
}

// what most people have watched: votes first, the rating breaks a tie
function byFame(list){
    return list.slice().sort((a, b)=>(b.vote_count || 0) - (a.vote_count || 0) || (b.vote_average || 0) - (a.vote_average || 0))
}

/**
 * @param {{cast:object[], crew:object[]}} credits TMDB combined_credits
 * @param {{known_for_department?:string}} person
 * @param {function(string):string} t translate
 * @param {number} [today] ms
 * @returns {{key:string, title:string, results:object[]}[]}
 */
function rows(credits, person, t, today = Date.now()){
    let cast = (credits && credits.cast || []).filter(c=>c && c.id && (c.title || c.name))
    let crew = (credits && credits.crew || []).filter(c=>c && c.id && (c.title || c.name))

    let roles   = cast.filter(c=>!isSelf(c))
    let self    = cast.filter(isSelf)
    let main    = person && person.known_for_department && person.known_for_department != 'Acting' ? crew.filter(c=>c.department == person.known_for_department) : roles
    let released = (list)=>list.filter(c=>!upcoming(c, today))
    let out     = []

    let add = (key, title, list, sort)=>{
        list = unique(sort(list))

        if(list.length) out.push({key, title: title + ' (' + list.length + ')', results: list})
    }

    let known = unique(byFame(released(main).filter(c=>c.vote_count))).slice(0, 20)

    if(known.length >= 3) out.push({key: 'known', title: t('hooktv_person_known_for'), results: known})

    add('movies', t('menu_movies'), released(roles.filter(c=>c.media_type == 'movie')), byDate)
    add('series', t('menu_tv'), released(roles.filter(c=>c.media_type == 'tv')), byDate)
    // announced work: a release date ahead, or a role with a poster already; undated crew projects are only ideas
    let soon = cast.filter(c=>!isSelf(c) && upcoming(c, today) && (time(c) || c.poster_path)).concat(crew.filter(c=>time(c) > today))

    add('soon', t('hooktv_person_soon'), soon, (l)=>l.slice().sort((a, b)=>(time(a) || Infinity) - (time(b) || Infinity)))

    DEPARTMENTS.forEach(([name, label])=>{
        add(name.toLowerCase(), t(label), released(crew.filter(c=>c.department == name)), byDate)
    })

    add('self', t('hooktv_person_self'), released(self), byDate)

    return out
}

/**
 * «Actor», «Director»… from TMDB's known_for_department
 */
function role(person, t){
    let key = ROLE[person && person.known_for_department]

    if(!key) return ''

    // TMDB gender 1 is female: «Акторка», «Режисерка» where the language has the word
    let female = person.gender == 1 && t(key + '_f')

    return female && female != key + '_f' ? female : t(key)
}

// Wikidata: «award received», and its qualifiers «for work», «point in time», «start time»
const AWARD = 'P166'
const FOR_WORK = 'P1686'
const WHEN = ['P585', 'P580']

const MAX_AWARDS = 40

function awardStatements(claims){
    return claims && claims[AWARD] || []
}

function qualifier(statement, prop){
    return statement.qualifiers && statement.qualifiers[prop] && statement.qualifiers[prop][0] || null
}

function snakId(snak){
    let value = snak && snak.snaktype == 'value' && snak.datavalue && snak.datavalue.value

    return value && value.id || ''
}

/**
 * Wikidata ids to look up the names of: each award and the work it was for
 * @param {object} claims Wikidata claims of the person
 * @returns {string[]}
 */
function awardIds(claims){
    let ids = []

    awardStatements(claims).forEach(statement=>{
        [snakId(statement.mainsnak), snakId(qualifier(statement, FOR_WORK))].forEach(id=>{
            if(id && ids.indexOf(id) == -1) ids.push(id)
        })
    })

    return ids
}

/**
 * The awards a person received, newest first; names come from the labels looked up for awardIds
 * @param {object} claims Wikidata claims of the person
 * @param {Object<string,string>} names Wikidata id → name in the interface language
 * @returns {{year:number|null, award:string, work:string}[]}
 */
function awards(claims, names){
    let list = awardStatements(claims).map(statement=>{
        let award = names[snakId(statement.mainsnak)]

        if(!award) return null

        let when = WHEN.map(prop=>qualifier(statement, prop)).find(Boolean)
        let year = when && when.datavalue ? parseInt(when.datavalue.value.time, 10) : NaN

        return {
            year: isNaN(year) ? null : year,
            award,
            work: names[snakId(qualifier(statement, FOR_WORK))] || ''
        }
    }).filter(Boolean)

    // the same award, year and work can come twice in Wikidata
    list = list.filter((item, i)=>list.findIndex(other=>other.year == item.year && other.award == item.award && other.work == item.work) == i)

    list.sort((a, b)=>(b.year == null) - (a.year == null) || (b.year || 0) - (a.year || 0))

    return list.slice(0, MAX_AWARDS)
}

/**
 * The genres of the work a person is in: each title counts once, the most common first
 * @param {{cast:object[], crew:object[]}} credits TMDB combined_credits
 * @param {number} [limit]
 * @returns {{media:string, id:number, count:number}[]} media is TMDB's «movie» or «tv», the genre list to name it from
 */
function genres(credits, limit = 12){
    let cast  = (credits && credits.cast || []).filter(c=>c && c.id && !isSelf(c))
    let crew  = (credits && credits.crew || []).filter(c=>c && c.id)
    let count = {}

    unique(cast.concat(crew)).forEach(credit=>{
        let media = credit.media_type == 'tv' ? 'tv' : 'movie'

        ;(credit.genre_ids || []).forEach(id=>{
            let key = media + ':' + id

            count[key] = (count[key] || 0) + 1
        })
    })

    return Object.keys(count).map(key=>{
        let [media, id] = key.split(':')

        return {media, id: parseInt(id, 10), count: count[key]}
    }).sort((a, b)=>b.count - a.count).slice(0, limit)
}

export default {
    age,
    ageText,
    awardIds,
    awards,
    genres,
    isSelf,
    rows,
    role
}
