(function () {
    'use strict';

    if (window.lampa_hotkeys_loaded) return;
    window.lampa_hotkeys_loaded = true;

    Lampa.Platform.tv();

    const VIDEO_SIZES = ['default', 'cover', 'fill', 's115', 's130', 'v115', 'v130'];

    function cycleVideoSize() {
        const sizes = (Lampa.Platform.is('tizen') && Lampa.Storage.field('player') === 'tizen')
            ? ['default', 'cover']
            : VIDEO_SIZES;

        const current = Lampa.Storage.get('player_size', 'default');
        const nextIndex = (sizes.indexOf(current) + 1) % sizes.length;
        const nextSize = sizes[nextIndex];

        Lampa.PlayerVideo.size(nextSize);
        Lampa.Storage.set('player_size', nextSize);
    }

    const KEYS = {
        next: {
            codes: [166, 427, 27, 33, 892, 68],
            action: () => Lampa.PlayerPlaylist.next()
        },
        prev: {
            codes: [167, 428, 28, 34, 893, 65],
            action: () => Lampa.PlayerPlaylist.prev()
        },
        size: {
            codes: [50, 98],
            action: () => cycleVideoSize()
        },
        playlist: {
            codes: [53, 101, 9],
            action: () => Lampa.PlayerPlaylist.show()
        },
        subs: {
            codes: [48, 96, 17],
            action: () => Lampa.PlayerPanel.render().find('.player-panel__subs').trigger('hover:enter')
        },
        tracks: {
            codes: [56, 104],
            action: () => Lampa.PlayerPanel.render().find('.player-panel__tracks').trigger('hover:enter')
        }
    };

    const CLOSE_KEYS = [
        ...KEYS.subs.codes,
        ...KEYS.playlist.codes,
        ...KEYS.tracks.codes
    ];

    function log(...args) {
        console.log('Hotkeys', ...args);
    }

    function listenHotkeys(e) {
        if (e.repeat) return;

        const keyCode = e.keyCode;

        if (Lampa.Select.opened()) {
            if (CLOSE_KEYS.includes(keyCode)) {
                Lampa.Select.close();
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            }
            return;
        }

        for (const item of Object.values(KEYS)) {
            if (item.codes.includes(keyCode)) {
                item.action();
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return;
            }
        }
    }

    function listenDestroy() {
        document.removeEventListener('keydown', listenHotkeys);
        Lampa.Player.listener.remove('destroy', listenDestroy);
    }

    function startHotkeys() {
        document.removeEventListener('keydown', listenHotkeys);
        document.addEventListener('keydown', listenHotkeys);
        Lampa.Player.listener.remove('destroy', listenDestroy);
        Lampa.Player.listener.follow('destroy', listenDestroy);
        log('Hotkeys 1.9 listener started');
    }

    Lampa.Player.listener.follow('ready', startHotkeys);
})();
