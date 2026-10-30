/**
 * Counts presses on one control. `taps` presses inside `windowMs` is the gesture.
 * A slow press starts the count again.
 * @param {{taps: number, windowMs: number}} options
 * @returns {() => boolean} call once per press; true on the press that completes the gesture
 */
export default function createTapCounter({taps = 5, windowMs = 3000} = {}){
    let count = 0
    let first = 0

    return function press(){
        let now = Date.now()

        if(now - first > windowMs){
            count = 0
            first = now
        }

        count++

        if(count < taps) return false

        count = 0

        return true
    }
}
