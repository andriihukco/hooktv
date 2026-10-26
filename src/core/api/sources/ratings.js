import Reguest from '../../../utils/reguest'
import Utils from '../../../utils/utils'
import TMDB from '../../tmdb/tmdb'

/**
 * Оценки IMDb и Кинопоиска. Их отдает сервер CUB поверх TMDB; в интерфейсе
 * сервер нигде не показан. Аккаунты, закладки и история к нему не относятся -
 * они работают через Supabase. Без ответа сервера страница открывается,
 * просто без этих двух оценок.
 */

let network = new Reguest()
let day     = 60 * 24

const fields = ['imdb_rating', 'kp_rating', 'cub_hundred_rating', 'cub_hundred_fire']

/**
 * @param {{method:string, id:number}} params
 * @param {function} oncomplite - получает объект с найденными оценками
 * @param {function} onerror
 */
function get(params, oncomplite, onerror){
    let host = window.lampa_settings.cub_server

    if(!host) return onerror()

    let url = Utils.protocol() + 'tmdb.' + host + '/3/' + params.method + '/' + params.id + '?api_key=' + TMDB.key()

    network.silent(url, (json)=>{
        let ratings = {}

        fields.forEach(name=>{
            if(json[name] !== undefined && json[name] !== null) ratings[name] = json[name]
        })

        oncomplite(ratings)
    }, onerror, false, {cache: {life: day * 7}, timeout: 1000 * 5})
}

export default {
    get,
    fields
}
