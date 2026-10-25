import DeviceInput from './device_input'

/**
 * HOOK TV: the header of the Saved and History pages, one template for both.
 * A row of chips sits on top of the content: each chip is a shelf (Saved) or
 * a media filter (History), with its count. The active chip is filled.
 */

/**
 * Добавить шапку библиотеки над сеткой или рядами
 * @param {object} comp - компонент страницы (Category или Main)
 * @param {Array} chips - [{title, count, active, onSelect}]
 * @returns {void}
 */
function mount(comp, chips){
    if(!chips.length) return

    let head  = $('<div class="library-head"><div class="library-head__chips"></div></div>')
    let list  = head.find('.library-head__chips')

    chips.forEach(chip=>{
        let item = $('<div class="library-head__chip selector"><span class="library-head__name"></span><span class="library-head__count"></span></div>')

        item.toggleClass('library-head__chip--active', Boolean(chip.active))
        item.find('.library-head__name').text(chip.title)
        item.find('.library-head__count').text(chip.count)

        item.on('click hover:enter', (e)=>{
            if(DeviceInput.noDubleClick(e)) chip.onSelect()
        })

        list.append(item)
    })

    comp.html.classList.add('library-page')

    // a grid (Category) keeps its own body, so the header goes in front of it;
    // a row list (Main) scrolls its rows as one body, which would carry the header
    // off the top as soon as a card takes focus, so the header sits above the scroller
    if(comp.body) comp.body.parentNode.insertBefore(head[0], comp.body)
    else comp.scroll.render(true).parentNode.insertBefore(head[0], comp.scroll.render(true))
}

export default {
    mount
}
