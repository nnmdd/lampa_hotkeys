(function () {
    'use strict';

    function applyBlackTheme() {
        if ( document.getElementById('lampa-black-style') ) return;

        var style = document.createElement('style');
        style.id = 'lampa-black-style';
        style.innerHTML = [
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
