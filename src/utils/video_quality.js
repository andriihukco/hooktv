const RESOLUTIONS = [480, 720, 1080, 1440, 2160]

function resolution(value){
    let text = (value || '').toString().trim().toLowerCase()
    let numeric = parseInt(text, 10)

    if(RESOLUTIONS.indexOf(numeric) >= 0) return numeric
    if(/(2160\s*p?|4k|uhd|ultrahd)/.test(text)) return 2160
    if(/(1440\s*p?|2k)/.test(text)) return 1440
    if(/(1080\s*p?|full\s*hd|fhd)/.test(text)) return 1080
    if(/(720\s*p?|\bhd\b)/.test(text)) return 720
    if(/(480\s*p?|\bsd\b)/.test(text)) return 480

    return 0
}

function target(value){
    return resolution(value) || 1080
}

function rank(value, preferred){
    let quality = resolution(value)
    let wanted = target(preferred)

    if(!quality) return 20000
    if(quality === wanted) return 0
    if(quality < wanted) return 1000 + wanted - quality

    return 10000 + quality - wanted
}

export default {
    resolution,
    target,
    rank
}
