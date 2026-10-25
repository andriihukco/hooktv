/**
 * UUID v4. Использует crypto, если он есть (старые ТВ-браузеры могут его не иметь).
 * @returns {string}
 */
export default function uuid(){
    let bytes = new Uint8Array(16)

    if(typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes)
    else for(let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    let hex = Array.from(bytes, b=>('0' + b.toString(16)).slice(-2)).join('')

    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20)
}
