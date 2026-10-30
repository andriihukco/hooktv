// Release-title parser for the indexer. JS \b does not treat Cyrillic letters
// as word characters, so every token uses Unicode-aware lookarounds instead.
const LETTER = '\\p{L}\\d'

function word(source, flags = 'iu') {
    return new RegExp(`(?<![${LETTER}])(?:${source})(?![${LETTER}])`, flags)
}

const DUBBING_STUDIO_PATTERNS = [
    {studio: 'Postmodern', pattern: word('postmodern|постмодерн')},
    {studio: 'Tak Treba Production', pattern: word('tak[\\s._]*treba|так[\\s._]*треба')},
    {studio: 'Omikron', pattern: word('omikron|омікрон')},
    {studio: 'Unidub', pattern: word('unidub|юнідаб')},
    {studio: 'Cikava Ideya', pattern: word('цікава[\\s._]*ідея')},
    {studio: 'Далі Буде', pattern: word('далі[\\s._]*буде')}
]

const UA_TAG = word('ukr|ukrainian|ua')
const UA_WORD = /українськ/iu
const QUALITY = word('(2160p|1080p|720p|4k|WEB-DL|BluRay)')
const NOISE = word('2160p|1080p|720p|480p|4k|WEB-DL|WEBRip|BDRip|DVDRip|BluRay|H\\.?26[45]|x264|x265|HEVC|AAC|DDP5\\.1|Ukr|UA|Eng|Jap|Spa|Sub', 'giu')

// Tracker titles list audio tracks before "|" and subtitles after it, so only
// the part before "|" decides whether the release has Ukrainian dubbing.
function audioPart(rawTitle) {
    return rawTitle.split('|')[0]
}

export function cleanTitle(rawTitle) {
    return audioPart(rawTitle)
        .replace(/\[[^\]]*\]|\([^)]*\)/g, ' ')
        .replace(NOISE, ' ')
        .replace(/[._/]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-–—|:,]+|[\s\-–—|:,]+$/g, '')
}

export function parseMediaMetadata(rawTitle) {
    const studio = DUBBING_STUDIO_PATTERNS.find(({pattern}) => pattern.test(rawTitle))
    const audio = audioPart(rawTitle)
    const quality = QUALITY.exec(rawTitle)

    return {
        rawTitle,
        cleanTitle: cleanTitle(rawTitle),
        dubbingStudio: studio ? studio.studio : 'Standard UA',
        isUkrainian: Boolean(studio) || UA_TAG.test(audio) || UA_WORD.test(audio),
        quality: quality ? quality[1].toUpperCase() : 'UNKNOWN'
    }
}
