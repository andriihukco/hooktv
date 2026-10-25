import Api from '../core/api/api'
import Main from '../interaction/items/main'
import Background from '../interaction/background'
import Utils from '../utils/utils'
import LineModule from '../interaction/items/line/module/module'
import Router from '../core/router'
import Person from '../interaction/person/person'
import PersonModule from '../interaction/person/module/module'
import Profile from '../utils/person_profile'
import Lang from '../core/lang'

function component(object){
    let comp = Utils.createInstance(Main, object)

    comp.use({
        onCreate: function(){
            Api.person(object,(data)=>{
                if(data.person){
                    let lines = []

                    // the genres of their work, shown as tags on the profile like a movie's genres
                    data.person.work_genres = Profile.genres(data.credits && data.credits.raw)

                    lines.push({
                        results: [],
                        params: {
                            module: LineModule.toggle(LineModule.MASK.none, 'Event'),
                            emit: {
                                onCreate: function(){
                                    this.person = Utils.createInstance(Person, data.person, {
                                        module: PersonModule.only('About')
                                    })

                                    this.person.create()

                                    this.scroll.append(this.person.render(true))
                                },
                                onToggle: function(){
                                    data.person.profile_path && Background.change(Api.img(data.person.profile_path, 'w200'))
                                },
                                onDestroy: function(){
                                    this.person?.destroy()
                                }
                            }
                        }
                    })

                    // Known for, Movies, Series, Coming soon, crew work, appearances (utils/person_profile.js)
                    Profile.rows(data.credits && data.credits.raw, data.person, Lang.translate.bind(Lang)).forEach(row=>{
                        lines.push({
                            title: row.title,
                            results: row.results,
                            params: {
                                module: LineModule.toggle(LineModule.MASK.base, 'More', 'Event')
                            }
                        })
                    })

                    if(lines.length) this.build(lines)
                    else this.empty()
                }
                else{
                    this.empty()
                }
            },this.empty.bind(this))
        },
        onInstance: function(item){
            item.use({
                onInstance: function(card, data){
                    card.use({
                        onEnter: Router.call.bind(Router, 'full', data),
                        onFocus: function(){
                            Background.change(Utils.cardImgBackground(data))
                        }
                    })
                }
            })
        }
    })

    return comp
}

export default component