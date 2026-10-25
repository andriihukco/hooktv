import Template from '../../template'
import TMDB from '../../../core/api/sources/tmdb'
import Lang from '../../../core/lang'
import Utils from '../../../utils/utils'
import Modal from '../../modal'
import Controller from '../../../core/controller'
import Noty from '../../noty'
import Storage from '../../../core/storage/storage'
import Account from '../../../core/account/account'
import Manifest from '../../../core/manifest'
import Arrays from '../../../utils/arrays'
import Profile from '../../../utils/person_profile'
import TMDBApi from '../../../core/tmdb/tmdb'

export default {
    onCreate: function(){
        let d    = this.data
        let code = Storage.get('language', 'uk')
        let t    = Lang.translate.bind(Lang)

        this.html   = Template.js('person_start', {})
        this.prefix = Template.prefix(this.html, 'person-start')

        this.subscribed = Storage.get('person_subscribes_id','[]').find(a=>a == d.id)

        let years = Profile.age(d.birthday, d.deathday)
        let role  = Profile.role(d, t)

        this.prefix.name.textContent    = d.name || ''
        this.prefix.eyebrow.textContent = [role, years != null && !d.deathday ? Profile.ageText(years, code) : ''].filter(Boolean).join(' · ')

        let fact = (label, value)=>{
            let row = document.createElement('div')
            let key = document.createElement('span')
            let val = document.createElement('span')

            row.className = 'person-start__fact'
            key.className = 'person-start__fact-label'
            key.textContent = label
            val.textContent = value

            row.appendChild(key)
            row.appendChild(val)

            this.prefix.facts.appendChild(row)
        }

        // «30 вересня 1975»: month names are lower case in the Slavic languages
        let day = (value)=>{
            let text = Utils.parseTime(value).full

            return ['uk', 'ru', 'be', 'bg'].indexOf(code) >= 0 ? text.toLowerCase() : text
        }

        if(d.birthday || d.place_of_birth) fact(t('hooktv_person_born'), [d.birthday ? day(d.birthday) : '', d.place_of_birth || ''].filter(Boolean).join(' · '))
        if(d.deathday) fact(t('hooktv_person_died'), day(d.deathday) + (years != null ? ' · ' + Profile.ageText(years, code) : ''))

        // round portrait: the face crop, not the full-height poster
        Utils.imgLoad(this.prefix.img, d.profile_path ? TMDB.img(d.profile_path, 'w500') : d.img || './img/actor.svg', (img)=>{
            img.addClass('loaded')
        })

        // the opening of the biography under the facts; the button opens all of it
        let preview = (text)=>{
            let first = (text || '').split(/\n\s*\n/)[0].trim()

            this.prefix.bio.textContent = first
            this.prefix.bio.classList.toggle('hide', !first)
        }

        preview(d.biography)

        // TMDB often has no Ukrainian biography: the English one beats none
        if(!d.biography && code != 'en' && d.id){
            $.get(TMDBApi.api('person/' + d.id + '?language=en-US&api_key=' + TMDBApi.key()), (json)=>{
                if(json && json.biography && !this.destroyed){
                    d.biography = json.biography

                    preview(json.biography)
                }
            })
        }

        this.html.find('.button--info').on('hover:enter',()=>{
            if(d.biography){
                Modal.open({
                    title: d.name,
                    size: 'large',
                    html: $('<div class="about"></div>').text(d.biography).css('white-space', 'pre-line'),
                    onBack: ()=>{
                        Modal.close()

                        Controller.toggle('content')
                    }
                })
            }
            else{
                Noty.show(Lang.translate('empty_title_two'))
            }
        }).on('hover:focus hover:enter hover:hover',(e)=>{
            this.last = e.target
        })

        if(window.lampa_settings.account_use) this.emit('subscribe', this.subscribed)

        if(window.lampa_settings.account_use){
            this.html.find('.button--subscribe').on('hover:enter',()=>{
                if(!Account.Permit.access) return Account.Modal.account()
                
                let subscribes = Storage.get('person_subscribes_id','[]')

                this.subscribed = subscribes.find(a=>a == this.data.id)

                if(!this.subscribed && !Account.hasPremium()) return Account.Modal.premium()

                let person = Arrays.clone(this.data)

                // Пихают там всякие иконки и прочее, удаляем лишнее
                delete person.biography

                Lampa.Network.silent(Utils.protocol() + Manifest.cub_domain + '/api/person/' + (this.subscribed ? 'unsubscribe' : 'subscribe'), ()=>{
                    if(this.subscribed) Arrays.remove(subscribes, this.data.id)
                    else if(subscribes.indexOf(this.data.id) == -1) subscribes.push(this.data.id)

                    Storage.set('person_subscribes_id', subscribes)

                    this.subscribed = subscribes.find(a=>a == this.data.id)

                    this.emit('subscribe', this.subscribed)
                },(err)=>{
                    if(err.responseJSON && err.responseJSON.code == 555) Account.Modal.premium()
                    else Noty.show(Lang.translate('subscribe_error'))
                },{
                    person: JSON.stringify(person)
                },{
                    headers: {
                        token: Account.Permit.token
                    }
                })
            }).on('hover:focus hover:enter hover:hover',(e)=>{
                this.last = e.target
            })
        }
        else this.html.find('.button--subscribe').remove()
    },

    onDestroy: function(){
        this.destroyed = true
    },

    onSubscribe: function(subscribed){
        this.html.find('.button--subscribe svg path:nth-of-type(2)').setAttribute('fill', subscribed ? 'currentColor' : 'transparent')
        this.html.find('.button--subscribe span').text(Lang.translate(subscribed ? 'title_unsubscribe' : 'title_subscribe'))
    }
}