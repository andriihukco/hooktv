let html = `<div class="search__body">
    <div class="search__input-shell">
        <div class="search__input-icon"><svg><use xlink:href="#sprite-search"></use></svg></div>
        <div class="search__input">#{search_input}...</div>
    </div>
    <div class="search__keypad"><div class="simple-keyboard"></div></div>
    <div class="search__history" data-area="history"></div>
    <div class="search__sources" data-area="sources"></div>
    <div class="search__results"></div>
</div>`

export default html