import Storage from '../core/storage/storage'
import Platform from '../core/platform'
import Base64 from '../utils/base64'
import Noty from '../interaction/noty'
import Utils from '../utils/utils'
import Request from '../utils/reguest'
import Lang from '../core/lang'
import Settings from '../interaction/settings/settings'
import Params from '../interaction/settings/params'

let torrent_net = new Request()

/**
 * Инициализация работы с локальным торрент сервером, проверка доступности и настройка
 * @returns {void}
 */
function init(){
    Storage.listener.follow('change', function (e) {
        if (e.name == 'torrserver_url') check(e.name)
        if (e.name == 'torrserver_url_two') check(e.name)
        if (e.name == 'torrserver_use_link') check(e.value == 'one' ? 'torrserver_url' : 'torrserver_url_two')
    })

    Settings.listener.follow('open', function (e){
        if(e.name == 'server'){
            check(Storage.field('torrserver_use_link') == 'one' ? 'torrserver_url' : 'torrserver_url_two')
        }
        else torrent_net.clear() 
    })

    Params.listener.follow('button', function (e){
        if(e.name == 'torrserver_autodetect') autodetect()
    })
}

/**
 * Адреса, по которым обычно доступен TorrServer: этот же компьютер или устройство,
 * с которого открыт интерфейс.
 * @returns {string[]}
 */
function candidates(){
    let list = ['http://127.0.0.1:8090', 'http://localhost:8090']
    let host = window.location && window.location.hostname

    if(host && host !== 'localhost' && host !== '127.0.0.1') list.push('http://' + host + ':8090')

    return list
}

/**
 * Поиск TorrServer без участия пользователя: проверяем адреса по очереди,
 * первый ответивший сохраняем как основной сервер.
 */
function autodetect(){
    let found = false
    let list  = candidates()

    Noty.show(Lang.translate('settings_server_autodetect_wait'), {time: 2000})

    function probe(index){
        if(index >= list.length || found){
            if(!found) Noty.show(Lang.translate('settings_server_autodetect_fail'), {time: 6000})

            return
        }

        torrent_net.clear()
        torrent_net.timeout(2500)

        torrent_net.native(list[index] + '/echo', ()=>{
            found = true

            Storage.set('torrserver_url', list[index])
            Storage.set('torrserver_use_link', 'one')

            Noty.show(Lang.translate('settings_server_autodetect_ok'), {time: 3000})

            check('torrserver_url')
        }, ()=>{
            probe(index + 1)
        }, false, {dataType: 'text'})
    }

    probe(0)
}

function check(name) {
    if(Platform.is('android') && !Storage.field('internal_torrclient')) return

    let item = $('[data-name="'+name+'"]').find('.settings-param__status').removeClass('active error wait').addClass('wait')
    let url  = Storage.get(name)

    if(url){
        torrent_net.timeout(10000)

        let head = {dataType: 'text'}
        let auth = Storage.field('torrserver_auth')

        if(auth){
            head.headers = {
                Authorization: "Basic " + Base64.encode(Storage.get('torrserver_login')+':'+Storage.value('torrserver_password'))
            }
        }

        torrent_net.native(Utils.checkEmptyUrl(Storage.get(name)), ()=>{
            item.removeClass('wait').addClass('active')
        }, (a, c)=> {
            if(a.status == 401){
                item.removeClass('wait').addClass('active')

                Noty.show(Lang.translate('torrent_error_check_no_auth') + ' - ' + url, {time: 5000})
            }
            else{
                item.removeClass('wait').addClass('error')

                Noty.show(torrent_net.errorDecode(a, c) + ' - ' + url, {time: 5000})
            }
        }, false, head)
    }
}

export default {
    init
}