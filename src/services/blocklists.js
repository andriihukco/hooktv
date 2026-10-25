import VPN from '../core/vpn'
import Arrays from '../utils/arrays'

/**
 * Списки блокировки, которые ведет сам HOOK TV (без внешних серверов):
 * public/data/dmca.json - правообладатели: [{"cat":"movie","id":123}]
 * public/data/lgbt.json - ЛГБТ-контент: [{"id":123,"type":"movie"}]
 * Пустые списки ничего не блокируют.
 */
function load(file, call){
    Lampa.Network.silent('./data/' + file, (list)=>{
        call(Arrays.isArray(list) ? list : [])
    }, ()=>{
        call([])
    })
}

function init(){
    if(!window.lampa_settings.disable_features.dmca){
        load('dmca.json', (list)=>{
            window.lampa_settings.dcma = list
        })
    }

    if(!window.lampa_settings.disable_features.lgbt){
        load('lgbt.json', (list)=>{
            let map = {}

            list.forEach(item=>{
                map[item.id + '_' + item.type] = true
            })

            window.lampa_settings.lgbt = map
        })

        if(!VPN.is(['ru', 'by'])){
            Lampa.SettingsApi.addParam({
                component: 'more',
                param: {
                    name: 'lgbt_content_block',
                    type: 'trigger',
                    default: false
                },
                field: {
                    name: Lampa.Lang.translate('settings_lgbt_content_block'),
                }
            })
        }
    }
}

export default {
    init
}
