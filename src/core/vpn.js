/**
 * Регион без сетевых запросов: код страны из языка браузера (ru-UA -> ua).
 * Географию CUB больше не определяем, автоматический TMDB Proxy отключен.
 */

let responce_code = 'ru'

function detect(){
    let parts = (navigator.language || '').toLowerCase().split('-')

    return (parts[1] || '').slice(0, 2) || responce_code
}

function region(call){
    responce_code = detect()

    if(call) call(responce_code)
}

function task(call){
    responce_code = detect()

    if(call) call()
}

function is(need_array = []){
    return need_array.indexOf(responce_code) >= 0
}

export default {
    region,
    task,
    code: ()=>responce_code,
    is
}
