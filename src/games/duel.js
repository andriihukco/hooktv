// The rules of Duel, kept apart from the drawing so they can be tested.
// The idea (two fighters, punch, kick, block, a life bar) comes from mk.js by mgechev (MIT). No art or names are reused.

export const ARENA = {w: 120, h: 70, ground: 60, wall: 7}

// reach: how far in front of the fighter's centre a hit lands; start/end: the active part of the move, in seconds
export const MOVES = {
    punch: {dur: .34, start: .08, end: .2, reach: 17, dmg: 7, stun: .26, push: 2},
    kick: {dur: .52, start: .18, end: .34, reach: 23, dmg: 12, stun: .4, push: 4}
}

// a hit lands only when the other fighter is in front, within reach, and not jumping over the move
export const inReach = (move, dx, lift) => dx > 0 && dx <= MOVES[move].reach && lift < 16

// the damage, stun and push of one hit; a guard takes a quarter of the damage and no stun
export function strike(move, guarded){
    const m = MOVES[move]

    return guarded ? {dmg: m.dmg / 4, stun: 0, push: m.push / 2} : {dmg: m.dmg, stun: m.stun, push: m.push}
}
