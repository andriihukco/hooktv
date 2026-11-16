/**
 * HOOK TV result order by audio: English first, then Ukrainian, then anything
 * else. A Russian result is removed, never listed.
 */
import Dub from './dub'

// Russian as a release tag in a title ("RUS", "рус"). "Russian Doll" is not a tag.
const RU_TAG = /(?:^|[\s._\-[(,|])(рус\w*|rus)(?=$|[\s._\-\])\],|])/i

/**
 * @param {{Title?:string, title?:string, info?:{voices?:string[]}}} item torrent result
 * @returns {-1|0|1|2} -1 Russian (dropped), 0 English, 1 Ukrainian, 2 unknown
 */
function audioGroup(item){
    let voices = ((item.info && item.info.voices) || []).join(' ')
    let title  = item.Title || item.title || ''

    if(Dub.classify(voices) == 'ru' || RU_TAG.test(title)) return -1

    let group = Dub.classify([voices, title].join(' '))

    if(group == 'original') return 0
    if(group == 'uk') return 1

    return 2
}

/**
 * Russian results removed; English before Ukrainian before unknown. The order
 * inside each group is kept, so the viewer's sort and "viewed first" still apply.
 * @param {object[]} list torrent results
 * @returns {object[]}
 */
function order(list){
    return list
        .map((item, index)=>({item, index, group: audioGroup(item)}))
        .filter(r=>r.group >= 0)
        .sort((a, b)=>a.group - b.group || a.index - b.index)
        .map(r=>r.item)
}

export default {audioGroup, order}
