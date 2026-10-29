/**
 * The releases a user has missed, newest first.
 * @param {Array<{id: string}>} releases - from releases.json, newest first
 * @param {string} lastSeen - id of the newest release this device has already updated to
 * @param {number} [unknownLimit=10] - how many to show when lastSeen is no longer listed
 * @returns {Array} releases to show; empty when the device is up to date
 */
export function missed(releases, lastSeen, unknownLimit = 10){
    if(!releases.length || releases[0].id == lastSeen) return []

    let index = releases.findIndex(item=>item.id == lastSeen)

    return index < 0 ? releases.slice(0, unknownLimit) : releases.slice(0, index)
}

export default {missed}
