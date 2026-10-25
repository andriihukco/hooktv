import Template from '../../template'
import TMDB from '../../../core/api/sources/tmdb'
import Lang from '../../../core/lang'
import Utils from '../../../utils/utils'
import Controller from '../../../core/controller'
import Noty from '../../noty'
import Storage from '../../../core/storage/storage'
import Account from '../../../core/account/account'
import Manifest from '../../../core/manifest'
import Arrays from '../../../utils/arrays'
import Profile from '../../../utils/person_profile'
import TMDBApi from '../../../core/tmdb/tmdb'
import Awards from '../../../utils/person_awards'
import Layer from '../../../core/layer'
import DeviceInput from '../../device_input'
import Activity from '../../activity/activity'
import Select from '../../select'

// one award: the year, its name, and the work it was for under it
function awardRow(item){
    let row   = document.createElement('div')
    let year  = document.createElement('span')
    let name  = document.createElement('span')
    let title = document.createElement('span')

    row.className   = 'person-start__award'
    year.className  = 'person-start__award-year'
    name.className  = 'person-start__award-name'
    title.className = 'person-start__award-work'

    year.textContent  = item.year != null ? item.year : ''
    name.textContent  = item.award
    title.textContent = item.work

    row.appendChild(year)
    row.appendChild(name)
    if(item.work) row.appendChild(title)

    return row
}

export default {
    onCreate: function(){
        let d    = this.data
        let code = Storage.get('language', 'uk')
        let t    = Lang.translate.bind(Lang)

        this.html   = Template.js('person_start', {})
        this.prefix = Template.prefix(this.html, 'person-start')

        this.subscribed = Storage.get('person_subscribes_id','[]').find(a=>a == d.id)

        let years = Profile.age(d.birthday, d.deathday)
        let alive = years != null && !d.deathday
        let role  = Profile.role(d, t)

        this.prefix.name.textContent    = d.name || ''
        this.prefix.eyebrow.textContent = role

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

        // «30 вересня 1975 (51 рік) · Київ»: the age is shown only while they are alive
        if(d.birthday || d.place_of_birth){
            let born = d.birthday ? day(d.birthday) + (alive ? ' (' + Profile.ageText(years, code) + ')' : '') : ''

            fact(t('hooktv_person_born'), [born, d.place_of_birth || ''].filter(Boolean).join(' · '))
        }
        if(d.deathday) fact(t('hooktv_person_died'), day(d.deathday) + (years != null ? ' · ' + Profile.ageText(years, code) : ''))

        // round portrait: the face crop, not the full-height poster
        Utils.imgLoad(this.prefix.img, d.profile_path ? TMDB.img(d.profile_path, 'w500') : d.img || './img/actor.svg', (img)=>{
            img.addClass('loaded')
        })

        // the opening of the biography under the facts; the link opens all of it
        let preview = (text)=>{
            let first = (text || '').split(/\n\s*\n/)[0].trim()

            this.prefix.bio.textContent = first
            this.prefix.bio.classList.toggle('hide', !first)
            this.prefix.more.classList.toggle('hide', !(text || '').trim())
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

        // the full biography slides in from the right, beside the profile
        this.bio      = Template.js('person_bio', {})
        this.bioPrefix = Template.prefix(this.bio, 'person-bio')

        $('body').append(this.bio)

        let close = ()=>{
            this.bio.removeClass('person-bio--open')

            Controller.toggle('content')
        }

        // one panel for the biography and the awards: the caller fills its body
        let show = (title, fill)=>{
            this.bioPrefix.title.textContent = title
            this.bioPrefix.body.textContent  = ''

            fill(this.bioPrefix.body)

            this.bio.addClass('person-bio--open')

            // the panel sits outside the page's layers: mark it visible, so the remote can reach it
            Layer.visible(this.bio)

            Controller.add('person_bio', {
                invisible: true,
                toggle: ()=>{
                    Controller.collectionSet(this.bio)
                    Controller.collectionFocus(this.bioPrefix.close, this.bio)
                },
                up: ()=>{
                    this.bioPrefix.body.scrollTop -= Math.round(window.innerHeight * 0.15)
                },
                down: ()=>{
                    this.bioPrefix.body.scrollTop += Math.round(window.innerHeight * 0.15)
                },
                back: close
            })

            Controller.toggle('person_bio')
        }

        let openBio = ()=>{
            show(d.name || '', (body)=>{
                body.textContent = d.biography || ''
            })
        }

        let openAwards = ()=>{
            show(t('hooktv_person_awards'), (body)=>{
                this.awards.forEach(item=>body.appendChild(awardRow(item)))
            })
        }

        // the remote's Enter and a mouse click do the same, as the modal's buttons do
        let press = (action)=>(e)=>{
            if(DeviceInput.noDubleClick(e)) action()
        }

        $(this.bioPrefix.close).on('click hover:enter', press(close))

        this.html.find('.person-start__more').on('click hover:enter', press(openBio)).on('hover:focus hover:enter hover:hover',(e)=>{
            this.last = e.target
        })

        // the tags row, as a movie's: each tag is a count that opens its list
        let tagCount = (name, count, action)=>{
            let tag = $(`<div class="tag-count selector">
                <div class="tag-count__name">${name}</div>
                <div class="tag-count__count">${count}</div>
            </div>`)

            tag.on('click hover:enter', press(action)).on('hover:focus hover:enter hover:hover',(e)=>{
                this.last = e.target
            })

            return tag[0]
        }

        // genres of their work: the same tag as a movie's, opening the genre's titles
        let genres = (d.work_genres || []).map(g=>({media: g.media, id: g.id, count: g.count, name: TMDB.getGenresNameFromIds(g.media, [g.id])[0]})).filter(g=>g.name)

        if(genres.length){
            this.prefix.tags.appendChild(tagCount(Lang.translate('full_genre'), genres.length, ()=>{
                Select.show({
                    title: Lang.translate('full_genre'),
                    items: genres.map(g=>({title: Utils.capitalizeFirstLetter(g.name), elem: g})),
                    onSelect: (a)=>{
                        Controller.toggle('content')

                        Activity.push({
                            url: a.elem.media,
                            title: Utils.capitalizeFirstLetter(a.elem.name),
                            component: 'category_full',
                            genres: a.elem.id,
                            source: 'tmdb',
                            page: 1
                        })
                    },
                    onBack: ()=>Controller.toggle('content')
                })
            }))
        }

        // the awards TMDB does not have: from Wikidata, once there is a person to look up; they open in the sidebar
        this.awards = []

        if(d.id) Awards.load(d.id, code, (list)=>{
            if(this.destroyed || !list.length) return

            this.awards = list

            this.prefix.tags.appendChild(tagCount(t('hooktv_person_awards'), list.length, openAwards))
        })

        // Подписка на актеров идет через CUB и отключена
        this.html.find('.button--subscribe').remove()
    },

    onDestroy: function(){
        this.destroyed = true

        if(this.bio) this.bio.remove()
    },

    onSubscribe: function(subscribed){
        this.html.find('.button--subscribe svg path:nth-of-type(2)').setAttribute('fill', subscribed ? 'currentColor' : 'transparent')
        this.html.find('.button--subscribe span').text(Lang.translate(subscribed ? 'title_unsubscribe' : 'title_subscribe'))
    }
}