/**
 * Counts taps on the head logo. A run of `taps` presses inside `windowMs` is the admin gesture.
 * Only the first press of a run goes home, so the presses that follow do not keep reopening the home page.
 * @param {{taps: number, windowMs: number}} options
 * @returns {() => {home: boolean, admin: boolean}} call once per press
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

        if(count >= taps){
            count = 0

            return {home: false, admin: true}
        }

        return {home: count == 1, admin: false}
    }
}
