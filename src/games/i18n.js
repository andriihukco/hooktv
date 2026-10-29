// What the games say, in the interface language. The app plugs its translator in (runtime.js);
// until then, and in the specs, the English text next to the key is what shows.
let translate = (key, fallback) => fallback

export function setTranslator(fn){
    translate = fn
}

/** a UI string: the translation when the language has one, the English text otherwise */
export const t = (key, fallback) => translate(key, fallback)

// Titles and hints are looked up under game_<id>_title / game_<id>_hint, and the folders under
// games_cat_<id>_title / games_cat_<id>_overview.
export const gameTitle = game => translate('game_' + game.id + '_title', game.title)
export const gameHint = game => translate('game_' + game.id + '_hint', game.hint || '')
export const categoryTitle = category => translate('games_cat_' + category.id + '_title', category.title)
export const categoryOverview = category => translate('games_cat_' + category.id + '_overview', category.overview)
