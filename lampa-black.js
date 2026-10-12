(function () {
    'use strict';

    function applyBlackTheme() {
        if ( document.getElementById('lampa-black-style') ) return;

        var style = document.createElement('style');
        style.id = 'lampa-black-style';
        style.innerHTML = [
            'body,',
            '.background,',
            '.selectbox__content,',
            '.settings__content,',
            '.settings-input__content,',
            '.settings-input--free,',
            '.modal__content,',
            '.navigation-bar__body,',
            '.extensions,',
            '.search-box,',
            '.bell__item,',
            '.discuss-rules {',
            '    background: #000000 !important;',
            '    background-color: #000000 !important;',
            '    backdrop-filter: none !important;',
            '    -webkit-backdrop-filter: none !important;',
            '}',
            'li.menu__item.selector {',
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
