// Mixes behind the homepage chips. `tag` is a MusicBrainz community tag used for artist and album discovery.
export const mixGroups = {
    mood: [
        {id: 'happy', tag: 'happy'},
        {id: 'relaxed', tag: 'relaxing'},
        {id: 'romantic', tag: 'romantic'},
        {id: 'energetic', tag: 'energetic'},
        {id: 'melancholic', tag: 'sad'},
        {id: 'dark', tag: 'dark'}
    ],
    occasion: [
        {id: 'party', tag: 'party'},
        {id: 'wedding', tag: 'wedding'},
        {id: 'christmas', tag: 'christmas'},
        {id: 'summer', tag: 'summer'},
        {id: 'roadtrip', tag: 'road trip'}
    ],
    activity: [
        {id: 'workout', tag: 'workout'},
        {id: 'focus', tag: 'instrumental'},
        {id: 'sleep', tag: 'sleep'},
        {id: 'running', tag: 'running'},
        {id: 'cooking', tag: 'cooking'}
    ]
}

export const defaultMix = 'happy'

export function findMix(id){
    for(let group of Object.keys(mixGroups)){
        let mix = mixGroups[group].find(item=>item.id == id)

        if(mix) return {...mix, group}
    }

    return {...mixGroups.mood[0], group: 'mood'}
}
