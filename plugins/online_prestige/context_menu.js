// Long-press menu for an online card: Lampa actions for the title being shown.
export default function showContextMenu(params, object){
    params.html.on('hover:long',()=>{
        function show(extra){
            let enabled = Lampa.Controller.enabled().name

            let menu = []

            if(Lampa.Platform.is('webos')){
                menu.push({
                    title: Lampa.Lang.translate('player_lauch') + ' - Webos',
                    player: 'webos'
                })
            }
            
            if(Lampa.Platform.is('android')){
                menu.push({
                    title: Lampa.Lang.translate('player_lauch') + ' - Android',
                    player: 'android'
                })
            }

            menu.push({
                title: Lampa.Lang.translate('player_lauch') + ' - Lampa',
                player: 'lampa'
            })

            menu.push({
                title: Lampa.Lang.translate('online_video'),
                separator: true
            })

            menu.push({
                title: Lampa.Lang.translate('torrent_parser_label_title'),
                mark: true
            })
            menu.push({
                title: Lampa.Lang.translate('torrent_parser_label_cancel_title'),
                unmark: true
            })
            menu.push({
                title: Lampa.Lang.translate('time_reset'),
                timeclear: true
            })

            if(extra){
                menu.push({
                    title: Lampa.Lang.translate('copy_link'),
                    copylink: true
                })
            }

            menu.push({
                title: Lampa.Lang.translate('more'),
                separator: true
            })

            if(Lampa.Account.logged() && params.element && typeof params.element.season !== 'undefined' && params.element.translate_voice){
                menu.push({
                    title: Lampa.Lang.translate('online_voice_subscribe'),
                    subscribe: true
                })
            }

            menu.push({
                title: Lampa.Lang.translate('online_clear_all_marks'),
                clearallmark: true
            })

            menu.push({
                title: Lampa.Lang.translate('online_clear_all_timecodes'),
                timeclearall: true
            })

            Lampa.Select.show({
                title: Lampa.Lang.translate('title_action'),
                items: menu,
                onBack: ()=>{
                    Lampa.Controller.toggle(enabled)
                },
                onSelect: (a)=>{
                    if(a.mark)      params.element.mark()
                    if(a.unmark)    params.element.unmark()
                    if(a.timeclear) params.element.timeclear()

                    if(a.clearallmark) params.onClearAllMark()
                    if(a.timeclearall) params.onClearAllTime()

                    Lampa.Controller.toggle(enabled)

                    if(a.player){
                        Lampa.Player.runas(a.player)

                        params.html.trigger('hover:enter')
                    }

                    if(a.copylink){
                        if(extra.quality){
                            let qual = []

                            for(let i in extra.quality){
                                qual.push({
                                    title: i,
                                    file: extra.quality[i]
                                })
                            }

                            Lampa.Select.show({
                                title: Lampa.Lang.translate('settings_server_links'), 
                                items: qual,
                                onBack: ()=>{
                                    Lampa.Controller.toggle(enabled)
                                },
                                onSelect: (b)=>{
                                    Lampa.Utils.copyTextToClipboard(b.file,()=>{
                                        Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'))
                                    },()=>{
                                        Lampa.Noty.show(Lampa.Lang.translate('copy_error'))
                                    })
                                }
                            })
                        }
                        else{
                            Lampa.Utils.copyTextToClipboard(extra.file,()=>{
                                Lampa.Noty.show(Lampa.Lang.translate('copy_secuses'))
                            },()=>{
                                Lampa.Noty.show(Lampa.Lang.translate('copy_error'))
                            })
                        }
                    }

                    if(a.subscribe){
                        Lampa.Account.subscribeToTranslation({
                            card: object.movie,
                            season: params.element.season,
                            episode: params.element.translate_episode_end,
                            voice: params.element.translate_voice
                        },()=>{
                            Lampa.Noty.show(Lampa.Lang.translate('online_voice_success'))
                        },()=>{
                            Lampa.Noty.show(Lampa.Lang.translate('online_voice_error'))
                        })
                    }
                }
            })
        }

        params.onFile(show)
    }).on('hover:focus',()=>{
        if(Lampa.Helper) Lampa.Helper.show('online_file',Lampa.Lang.translate('helper_online_file'),params.html)
    })
}
