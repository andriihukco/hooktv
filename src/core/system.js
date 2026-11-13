const FEATURE_BY_ACTION = {
    movie: 'movies',
    cartoon: 'movies',
    tv: 'series',
    ua_tv: 'live_tv',
    games: 'games',
    music: 'music',
    video: 'videos'
}

export function systemFeatureEnabled(feature){
    const flags = window.lampa_settings && window.lampa_settings.hooktv_system_flags

    return !flags || flags[feature] !== false
}

export function menuActionEnabled(action){
    const feature = FEATURE_BY_ACTION[action]

    return !feature || systemFeatureEnabled(feature)
}
