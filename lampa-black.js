(function () {
    'use strict';

    function applyBlackTheme() {
        if ( document.getElementById('lampa-black-style') ) return;

        var style = document.createElement('style');
        style.id = 'lampa-black-style';
        style.innerHTML = [
            /* Чёрная тема (только когда выключен режим стекла) */
            'body:not(.glass--style),',
            'body:not(.glass--style) .background,',
            'body:not(.glass--style) .selectbox__content,',
            'body:not(.glass--style) .settings__content,',
            'body:not(.glass--style) .settings-input__content,',
            'body:not(.glass--style) .settings-input--free,',
            'body:not(.glass--style) .modal__content,',
            'body:not(.glass--style) .navigation-bar__body,',
            'body:not(.glass--style) .extensions,',
            'body:not(.glass--style) .search-box,',
            'body:not(.glass--style) .bell__item,',
            'body:not(.glass--style) .discuss-rules {',
            '    background: #000000 !important;',
            '    background-color: #000000 !important;',
            '}',
            'body:not(.glass--style) li.menu__item.selector {',
            '    -webkit-border-radius: 0 !important;',
            '    -moz-border-radius: 0 !important;',
            '    border-radius: 0 !important;',
            '}',

            /* Стеклянный стиль для горизонтального меню (Поиск, Сортировать, Фильтр) */
            'body.glass--style .torrent-filter .simple-button:not(.focus),',
            'body.glass--style .simple-button--filter:not(.focus) {',
            '    background-color: rgba(70, 70, 70, 0.3) !important;',
            '    backdrop-filter: blur(1.6em) !important;',
            '    -webkit-backdrop-filter: blur(1.6em) !important;',
            '}',
            'body.glass--style.glass--style-opacity--medium .torrent-filter .simple-button:not(.focus),',
            'body.glass--style.glass--style-opacity--medium .simple-button--filter:not(.focus) {',
            '    background-color: rgba(70, 70, 70, 0.45) !important;',
            '}',
            'body.glass--style.glass--style-opacity--blacked .torrent-filter .simple-button:not(.focus),',
            'body.glass--style.glass--style-opacity--blacked .simple-button--filter:not(.focus) {',
            '    background-color: rgba(56, 56, 56, 0.7) !important;',
            '}',
            'body.glass--style .simple-button--filter > div {',
            '    background-color: rgba(255, 255, 255, 0.15) !important;',
            '}',
            'body.glass--style .simple-button--filter.focus > div {',
            '    background-color: rgba(0, 0, 0, 0.12) !important;',
            '}'
        ].join('\n');

        document.head.appendChild(style);
    }

    if (window.appready) {
        applyBlackTheme();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') applyBlackTheme();
        });
    }
})();
