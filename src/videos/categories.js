import Storage from '../core/storage/storage'

/**
 * Categories shown as chips on the Videos page. `yt` is the YouTube videoCategoryId
 * used for the most-popular chart. Each one can be switched off in Settings → Videos.
 */
export const CATEGORIES = [
    {id: 'music', yt: '10', label: 'videos_cat_music'},
    {id: 'gaming', yt: '20', label: 'videos_cat_gaming'},
    {id: 'movies', yt: '1', label: 'videos_cat_movies'},
    {id: 'news', yt: '25', label: 'videos_cat_news'},
    {id: 'sports', yt: '17', label: 'videos_cat_sports'},
    {id: 'science', yt: '28', label: 'videos_cat_science'},
    {id: 'comedy', yt: '23', label: 'videos_cat_comedy'}
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
