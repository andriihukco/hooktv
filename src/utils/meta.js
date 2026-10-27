/**
 * One rating-and-year line for every title card: the hero, the hover preview and the
 * title page all build it here, so the star, the number, the colour and the dots match.
 */

// the score colour: strong, fair, weak
export function rateTone(value){
    return value >= 7 ? 'good' : value >= 5 ? 'mid' : 'bad'
}

// ★ 7.3, in the tone colour; empty when there is no score
export function rateHTML(value){
    if(!(value > 0)) return ''

    return '<span class="hk-rate rate--' + rateTone(value) + '">★ <span class="hk-rate__value">' + Math.min(value, 10).toFixed(1) + '</span></span>'
}

// the year a card was released in, or ''
export function metaYear(card){
    return ((card.release_date || card.first_air_date || '') + '').slice(0, 4)
}

// parts joined by a muted dot: rating • year • countries
export function metaRow(parts){
    return parts.filter(Boolean).join('<span class="meta-split">•</span>')
}
