/**
 * Short view count: 1234 → 1.2K, 3400000 → 3.4M
 * @param {number} value
 * @returns {string}
 */
export function views(value){
    if(!value) return ''

    if(value >= 1e9) return (value / 1e9).toFixed(1).replace('.0', '') + 'B'
    if(value >= 1e6) return (value / 1e6).toFixed(1).replace('.0', '') + 'M'
    if(value >= 1e3) return (value / 1e3).toFixed(1).replace('.0', '') + 'K'

    return String(value)
}
