import main from '../components/main'
import full from '../components/full'
import category_full from '../components/category/full'
import category from '../components/category/main'
import actor from '../components/person'
import favorite from '../components/favorite'
import torrents from '../components/torrents'
import mytorrents from '../components/mytorrents'
import nocomponent from '../components/nocomponent'
import timetable from '../components/timetable'
import company from '../components/company'
import bookmarks from '../components/bookmarks'
import episodes from '../components/episodes'
import recomend from '../components/recomend'
import ua_tv from '../components/ua_tv'

let component = {
    main,
    full,
    category,
    category_full,
    actor,
    favorite,
    torrents,
    mytorrents,
    nocomponent,
    timetable,
    company,
    bookmarks,
    episodes,
    recomend,
    ua_tv
}

/**
 * Создать компонент
 * @param {{component:string}} object 
 * @returns 
 */
function create(object){
    if(component[object.component]){
        try{
            return new component[object.component](object)
        }
        catch(e){
            console.log('Component','create error',e.stack)

            return new component.nocomponent(object)
        }
    }
    else{
        return new component.nocomponent(object)
    }
}

/**
 * Добавить компонент
 * @param {string} name 
 * @param {class} comp 
 */
function add(name, comp){
    component[name] = comp
}

/**
 * Получить компонент
 * @param {string} name 
 * @returns {class}
 */
function get(name){
    return component[name]
}

export default {
    create,
    add,
    get
}