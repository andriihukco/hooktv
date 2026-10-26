import request from './client.js'
import Auth from './auth.js'

/**
 * Лайки и дизлайки тайтла: счётчики видны всем, чужие голоса не видны.
 * Голос ставится через set_reaction: тот же голос снимает, противоположный меняет.
 */

/**
 * Счётчики и голос текущего пользователя (без входа голоса не будет)
 * @param {string} media - 'movie' или 'tv'
 * @param {number|string} id - id тайтла в TMDB
 * @returns {Promise<{likes: number, dislikes: number, mine: string|null}>}
 */
function counts(media, id){
    let s = Auth.session()

    return request('rpc/reaction_counts', {
        method: 'POST',
        token: s ? s.token : undefined,
        body: {p_media: media, p_card_id: String(id)}
    })
}

/**
 * Поставить, сменить или снять голос
 * @param {string} media - 'movie' или 'tv'
 * @param {number|string} id - id тайтла в TMDB
 * @param {'like'|'dislike'} type
 * @returns {Promise<{likes: number, dislikes: number, mine: string|null}>}
 */
function vote(media, id, type){
    let s = Auth.session()

    if(!s) return Promise.reject({status: 0, code: 'no_session', message: ''})

    return request('rpc/set_reaction', {
        method: 'POST',
        token: s.token,
        body: {p_media: media, p_card_id: String(id), p_vote: type}
    })
}

export default {
    counts,
    vote
}
