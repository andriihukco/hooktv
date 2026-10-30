/**
 * Position after a relative seek, kept inside the track.
 * @param {number} current seconds now
 * @param {number} delta seconds to move, negative to go back
 * @param {number} duration track length in seconds, NaN or 0 when unknown
 * @returns {number} the new position, never below 0 or past the end
 */
export function seekTime(current, delta, duration){
    let now = Number.isFinite(current) && current > 0 ? current : 0
    let end = Number.isFinite(duration) && duration > 0 ? duration : Infinity

    return Math.min(end, Math.max(0, now + delta))
}

export default {seekTime}
