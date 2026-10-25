let html = `<div class="full-start-new">
    <div class="full-start-new__body">
        <div class="full-start-new__left">
            <div class="full-start-new__poster">
                <img class="full-start-new__img full--poster" />
            </div>
        </div>

        <div class="full-start-new__right">
            <div class="full-start-new__head"></div>
            <div class="full-start-new__title">{title}</div>
            <div class="full-start-new__tagline full--tagline">{tagline}</div>
            <div class="full-start-new__rate-line">
                <div class="full-start__rate rate--tmdb"><div>{rating}</div><div class="source--name"><svg viewBox="0 0 24 24" aria-label="TMDB"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div></div>
                <div class="full-start__rate rate--imdb hide"><div></div><div class="source--name"><svg viewBox="0 0 24 24" aria-label="IMDb"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div>IMDb</div></div>

                <div class="full-start__pg hide"></div>
                <div class="full-start__status hide"></div>
                <div class="full-start__year hide"></div>            </div>
            <div class="full-start-new__details"></div>
            <div class="full-start-new__genres"></div>

            <div class="full-start-new__buttons">
                <div class="full-start__button selector button--play">
                    <svg><use xlink:href="#sprite-play"></use></svg>

                    <span>#{hooktv_watch_now}</span>
                </div>

                <div class="full-start__button selector button--book">
                    <svg width="21" height="32" viewBox="0 0 21 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 1.5H19C19.2761 1.5 19.5 1.72386 19.5 2V27.9618C19.5 28.3756 19.0261 28.6103 18.697 28.3595L12.6212 23.7303C11.3682 22.7757 9.63183 22.7757 8.37885 23.7303L2.30302 28.3595C1.9739 28.6103 1.5 28.3756 1.5 27.9618V2C1.5 1.72386 1.72386 1.5 2 1.5Z" stroke="currentColor" stroke-width="2.5"/>
                    </svg>

                    <span>#{settings_input_links}</span>
                </div>

                <div class="full-start__button selector button--like" title="#{reactions_nice}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>

                    <span class="button--like-count">0</span>
                </div>

                <div class="full-start__button selector button--dislike" title="#{reactions_shit}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>

                    <span class="button--dislike-count">0</span>
                </div>

                <div class="full-start__button selector button--subscribe hide">
                    <svg viewBox="0 0 25 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.01892 24C6.27423 27.3562 9.07836 30 12.5 30C15.9216 30 18.7257 27.3562 18.981 24H15.9645C15.7219 25.6961 14.2632 27 12.5 27C10.7367 27 9.27804 25.6961 9.03542 24H6.01892Z" fill="currentColor"></path>
                        <path d="M3.81972 14.5957V10.2679C3.81972 5.41336 7.7181 1.5 12.5 1.5C17.2819 1.5 21.1803 5.41336 21.1803 10.2679V14.5957C21.1803 15.8462 21.5399 17.0709 22.2168 18.1213L23.0727 19.4494C24.2077 21.2106 22.9392 23.5 20.9098 23.5H4.09021C2.06084 23.5 0.792282 21.2106 1.9273 19.4494L2.78317 18.1213C3.46012 17.0709 3.81972 15.8462 3.81972 14.5957Z" stroke="currentColor" stroke-width="2.6"></path>
                    </svg>

                    <span>#{title_subscribe}</span>
                </div>

                <div class="full-start__button selector button--share">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 13.5a4.5 4.5 0 0 0 6.36 0l3-3a4.5 4.5 0 0 0-6.36-6.36l-1.5 1.5M14 10.5a4.5 4.5 0 0 0-6.36 0l-3 3a4.5 4.5 0 0 0 6.36 6.36l1.5-1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>

                    <span>#{copy_link_buffer}</span>
                </div>
            </div>
        </div>
    </div>

    <div class="hide buttons--container">
        <div class="full-start__button view--torrent hide">
            <svg><use xlink:href="#sprite-torrent"></use></svg>

            <span>#{full_torrents}</span>
        </div>
    </div>

    <button class="full-start-new__scroll selector" type="button" aria-label="#{hooktv_scroll_down}">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
</div>`

export default html