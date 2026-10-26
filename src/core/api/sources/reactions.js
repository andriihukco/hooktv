import Reguest from '../../../utils/reguest'
import Utils from '../../../utils/utils'
import Storage from '../../storage/storage'

/**
 * Реакции зрителей (fire, nice, think, bore, shit). Их хранит сервер CUB, тот же, что и для оценок IMDb/КП.
 * Без ответа сервера карточка открывается, просто без счетчиков.
 */

let network = new Reguest()

function host(){
    return Utils.protocol() + window.lampa_settings.cub_server
}

function image(type){
    return host() + '/img/reactions/' + type + '.svg'
}

/**
 * @param {{method:string, id:number}} params
 * @param {function} oncomplite - получает {result: [{type, counter}]}
 */
function get(params, oncomplite){
    if(window.lampa_settings.disable_features.reactions || !window.lampa_settings.cub_server) return oncomplite({result: []})

    network.silent(host() + '/api/reactions/get/' + params.method + '_' + params.id, oncomplite, ()=>{
        oncomplite({result: []})
    }, false, {timeout: 1000 * 5})
}

/**
 * @param {{method:string, id:number, type:string}} params
 * @param {function} oncomplite
 * @param {function} onerror
 */
function add(params, oncomplite, onerror){
    network.silent(host() + '/api/reactions/add/' + params.method + '_' + params.id + '/' + params.type + '?uid=' + Storage.get('lampa_uid','none'), oncomplite, onerror)
}

export default {
    get,
    add,
    image
}
