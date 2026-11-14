// Filmix account storage and auth keys for the HOOK TV online service.
import Storage from '../core/storage/storage'
import Utils from '../utils/utils'

export var AUTH_KEYS = {
    filmixToken: 'HOOK_FILMIX_TOKEN',
    filmixDeviceId: 'HOOK_FILMIX_DEVICE_ID',
    filmixMaxQuality: 'HOOK_FILMIX_MAX_QUALITY'
}

export function normalize(value) {
    return (value || '').toString().trim()
}

export function readAuth(key, fallbackKey) {
    var val = normalize(Storage.get(key, ''))
    if (!val && fallbackKey) val = normalize(Storage.get(fallbackKey, ''))
    return val
}

export function writeAuth(key, value) {
    Storage.set(key, normalize(value))
}

export function getFilmixToken() {
    return readAuth(AUTH_KEYS.filmixToken, 'BO_FILMIX_TOKEN')
}

export function setFilmixToken(value) {
    writeAuth(AUTH_KEYS.filmixToken, value)
}

export function getFilmixDeviceId() {
    return readAuth(AUTH_KEYS.filmixDeviceId, 'BO_FILMIX_DEVICE_ID')
}

export function setFilmixDeviceId(value) {
    writeAuth(AUTH_KEYS.filmixDeviceId, value)
}

export function ensureFilmixDeviceId() {
    var deviceId = getFilmixDeviceId()
    if (!deviceId) {
        deviceId = Utils.uid(16)
        setFilmixDeviceId(deviceId)
    }
    return deviceId
}
