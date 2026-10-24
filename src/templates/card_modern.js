let html = `<div class="card-modern card-modern--<%=size%> selector">
    <% if (poster) { %>
    <img class="card-modern__poster" src="<%=poster%>" alt="<%=title%>" loading="lazy">
    <% } else { %>
    <div class="card-modern__poster">
        <div class="card-modern__error-icon">?</div>
    </div>
    <% } %>
    
    <div class="card-modern__overlay"></div>
    
    <% if (show_badge) { %>
        <% if (is_new) { %>
        <div class="card-modern__badge card-modern__badge--new">New</div>
        <% } else if (is_top) { %>
        <div class="card-modern__badge card-modern__badge--top">Top 10</div>
        <% } else if (quality) { %>
        <div class="card-modern__badge card-modern__badge--quality"><%=quality%></div>
        <% } %>
    <% } %>
    
    <% if (is_watched) { %>
    <div class="card-modern__watched"></div>
    <% } %>
    
    <% if (show_progress && watch_progress > 0) { %>
    <div class="card-modern__progress">
        <div class="card-modern__progress-bar" style="width: <%=watch_progress%>%"></div>
    </div>
    <% } %>
    
    <% if (show_favorite) { %>
    <div class="card-modern__favorite <%=is_favorite ? 'card-modern__favorite--active' : ''%>"></div>
    <% } %>
    
    <div class="card-modern__content">
        <h3 class="card-modern__title"><%=title%></h3>
        <div class="card-modern__meta">
            <% if (year) { %>
            <span class="card-modern__year"><%=year%></span>
            <% } %>
            <% if (rating) { %>
            <span class="card-modern__rating"><%=rating%></span>
            <% } %>
        </div>
    </div>
</div>`

export default html
