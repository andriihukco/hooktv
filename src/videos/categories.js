import Storage from '../core/storage/storage'

/**
 * Categories shown as shelves on the Home page. `query` is the search the shelf runs
 * (the keyless source has no category charts). Each one can be switched off in Settings → Interface.
 */
export const CATEGORIES = [
    {id: 'music', query: 'music video', label: 'videos_cat_music'},
    {id: 'gaming', query: 'gaming', label: 'videos_cat_gaming'},
    {id: 'movies', query: 'movie trailer', label: 'videos_cat_movies'},
    {id: 'news', query: 'news today', label: 'videos_cat_news'},
    {id: 'sports', query: 'sports highlights', label: 'videos_cat_sports'},
    {id: 'science', query: 'science explained', label: 'videos_cat_science'},
    {id: 'comedy', query: 'comedy sketch', label: 'videos_cat_comedy'}
]

/**
 * Storage key of the on/off switch for a category
 * @param {string} id
 * @returns {string}
 */
export function storageKey(id){
    return 'videos_cat_' + id
}

/**
 * Categories that are switched on; a category is on until the user turns it off
 * @returns {Array}
 */
export function enabledCategories(){
    return CATEGORIES.filter(item=> String(Storage.get(storageKey(item.id), true)) !== 'false')
}
