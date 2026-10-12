(function () {
    'use strict';

    if (window.lampa_hotkeys_loaded) return;
    window.lampa_hotkeys_loaded = true;

    Lampa.Platform.tv();

    if (!document.getElementById('lampa-hotkeys-noty-style')) {
        const style = document.createElement('style');
        style.id = 'lampa-hotkeys-noty-style';
        style.textContent = `
            .noty.noty--style--transparent {
                background: transparent !important;
                backdrop-filter: none !important;
                color: #fff !important;
                pointer-events: none;
            }
            .noty.noty--style--transparent .noty__text {
                display: inline-block;
                background: rgba(0, 0, 0, 0.45);
                padding: 0.4em 1.2em;
                border-radius: 0.5em;
                text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);
            }
        `;
        document.head.appendChild(style);
    }

    const VIDEO_SIZES = ['default', 'cover', 'fill', 's115', 's130', 'v115', 'v130'];
    const VIDEO_SPEEDS = ['0.25', '0.50', '0.75', 'default', '1.25', '1.50', '1.75', '2'];

    function showToast(text) {
        Lampa.Noty.show(text, { time: 1500, style: 'transparent' });
    }

    function cycleVideoSize() {
        const sizes = (Lampa.Platform.is('tizen') && Lampa.Storage.field('player') === 'tizen')
            ? ['default', 'cover']
            : VIDEO_SIZES;

        const current = Lampa.Storage.get('player_size', 'default');
        const nextIndex = (sizes.indexOf(current) + 1) % sizes.length;
        const nextSize = sizes[nextIndex];

        Lampa.PlayerVideo.size(nextSize);
        Lampa.Storage.set('player_size', nextSize);

        showToast(Lampa.Lang.translate('player_video_size') + ': ' + Lampa.Lang.translate('player_size_' + nextSize + '_title'));
    }

    function changeVideoSpeed(step) {
        const isLimitedPlayer = (Lampa.Platform.is('tizen') && Lampa.Storage.field('player') === 'tizen') ||
                                (Lampa.Platform.is('orsay') && Lampa.Storage.field('player') === 'orsay');

        const speeds = isLimitedPlayer ? ['default', '2'] : VIDEO_SPEEDS;

        const current = String(Lampa.Storage.get('player_speed', 'default'));
        let currentIndex = speeds.indexOf(current);
        if (currentIndex === -1) currentIndex = speeds.indexOf('default');

        const nextIndex = Math.max(0, Math.min(speeds.length - 1, currentIndex + step));
        const nextSpeed = speeds[nextIndex];

        Lampa.PlayerVideo.speed(nextSpeed);
        Lampa.Storage.set('player_speed', nextSpeed);

        const speedText = nextSpeed === 'default'
            ? Lampa.Lang.translate('player_speed_default_title')
            : nextSpeed + 'x';

        showToast(Lampa.Lang.translate('player_video_speed') + ': ' + speedText);
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
        speed_down: {
            codes: [49, 97],
            action: () => changeVideoSpeed(-1)
        },
        size: {
            codes: [50, 98],
            action: () => cycleVideoSize()
        },
        speed_up: {
            codes: [51, 99],
            action: () => changeVideoSpeed(1)
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
