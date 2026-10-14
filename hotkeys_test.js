(function () {
    'use strict';

    if (window.lampa_hotkeys_loaded) return;
    window.lampa_hotkeys_loaded = true;

    Lampa.Platform.tv();

    if (!document.getElementById('lampa-hotkeys-noty-style')) {
        var style = document.createElement('style');
        style.id = 'lampa-hotkeys-noty-style';
        style.textContent =
            '.noty.noty--style--transparent {' +
                'background: transparent !important;' +
                'backdrop-filter: none !important;' +
                'color: #fff !important;' +
                'pointer-events: none;' +
            '}' +
            '.noty.noty--style--transparent .noty__text {' +
                'display: inline-block;' +
                'background: rgba(0, 0, 0, 0.45);' +
                'padding: 0.4em 1.2em;' +
                'border-radius: 0.5em;' +
                'text-shadow: 0 1px 4px rgba(0, 0, 0, 0.9);' +
            '}' +
            '.player-panel__size,' +
            '.player-panel__speed {' +
                'position: relative;' +
            '}' +
            '.hotkey-panel-badge {' +
                'position: absolute;' +
                'bottom: -0.35em;' +
                'right: -0.35em;' +
                'background: #fff;' +
                'color: #000;' +
                'font-size: 0.55em;' +
                'font-weight: 700;' +
                'padding: 0.1em 0.35em;' +
                'border-radius: 0.3em;' +
                'line-height: 1.1;' +
                'pointer-events: none;' +
                'white-space: nowrap;' +
                'box-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);' +
                'z-index: 2;' +
            '}';
        document.head.appendChild(style);
    }

    var VIDEO_SIZES = ['default', 'cover', 'fill', 's115', 's130', 'v115', 'v130'];
    var VIDEO_SPEEDS = ['0.25', '0.50', '0.75', 'default', '1.25', '1.50', '1.75', '2'];

    function showToast(text) {
        Lampa.Noty.show(text, { time: 1500, style: 'transparent' });
    }

    function stopEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function isPlayerControllerActive() {
        if (!Lampa.Controller || !Lampa.Controller.enabled) return true;
        var enabled = Lampa.Controller.enabled();
        if (!enabled || !enabled.name) return true;
        // Разрешаем работу хоткеев во время воспроизведения и при открытой нижней панели
        return enabled.name === 'player' ||
               enabled.name === 'player_panel' ||
               enabled.name === 'player_footer';
    }

    function triggerPanelButton(selector) {
        var panel = Lampa.PlayerPanel.render();
        if (panel) {
            panel.find(selector).trigger('hover:enter');
        }
    }

    function updatePanelBadge(buttonSelector, text, isDefault) {
        var panel = Lampa.PlayerPanel.render();
        if (!panel) return;

        var btn = panel.find(buttonSelector);
        if (!btn.length) return;

        var badge = btn.find('.hotkey-panel-badge');

        if (isDefault) {
            if (badge.length) badge.remove();
            return;
        }

        if (!badge.length) {
            badge = $('<div class="hotkey-panel-badge"></div>');
            btn.append(badge);
        }

        badge.text(text);
    }

    function onPanelSizeChange(e) {
        if (!e || !e.size) return;
        updatePanelBadge('.player-panel__size', String(e.size).toUpperCase(), e.size === 'default');
    }

    function onPanelSpeedChange(e) {
        if (!e || !e.speed) return;
        var badgeText = e.speed === 'default' ? '1x' : e.speed + 'x';
        updatePanelBadge('.player-panel__speed', badgeText, e.speed === 'default');
    }

    function cycleVideoSize() {
        var isTizenPlayer = Lampa.Platform.is('tizen') && Lampa.Storage.field('player') === 'tizen';
        var sizes = isTizenPlayer ? ['default', 'cover'] : VIDEO_SIZES;

        var current = Lampa.Storage.get('player_size', 'default');
        var currentIndex = sizes.indexOf(current);
        var nextIndex = (currentIndex + 1) % sizes.length;
        var nextSize = sizes[nextIndex];

        Lampa.Storage.set('player_size', nextSize);
        Lampa.PlayerVideo.size(nextSize);

        if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
            Lampa.PlayerPanel.listener.send('size', { size: nextSize });
        } else {
            updatePanelBadge('.player-panel__size', nextSize.toUpperCase(), nextSize === 'default');
        }

        showToast(
            Lampa.Lang.translate('player_video_size') + ': ' +
            Lampa.Lang.translate('player_size_' + nextSize + '_title')
        );
    }

    function changeVideoSpeed(step) {
        var playerType = Lampa.Storage.field('player');
        var isLimitedPlayer = (Lampa.Platform.is('tizen') && playerType === 'tizen') ||
                              (Lampa.Platform.is('orsay') && playerType === 'orsay');

        var speeds = isLimitedPlayer ? ['default', '2'] : VIDEO_SPEEDS;

        var current = String(Lampa.Storage.get('player_speed', 'default'));
        var currentIndex = speeds.indexOf(current);
        if (currentIndex === -1) currentIndex = speeds.indexOf('default');

        var nextIndex = Math.max(0, Math.min(speeds.length - 1, currentIndex + step));
        var nextSpeed = speeds[nextIndex];

        if (nextSpeed !== current) {
            Lampa.Storage.set('player_speed', nextSpeed);
            Lampa.PlayerVideo.speed(nextSpeed);

            if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
                Lampa.PlayerPanel.listener.send('speed', { speed: nextSpeed });
            } else {
                var badgeText = nextSpeed === 'default' ? '1x' : nextSpeed + 'x';
                updatePanelBadge('.player-panel__speed', badgeText, nextSpeed === 'default');
            }
        }

        var speedText = nextSpeed === 'default'
            ? Lampa.Lang.translate('player_speed_default_title')
            : nextSpeed + 'x';

        showToast(Lampa.Lang.translate('player_video_speed') + ': ' + speedText);
    }

    function switchEpisode(direction) {
        if (direction > 0) {
            Lampa.PlayerPlaylist.next();
        } else {
            Lampa.PlayerPlaylist.prev();
        }
        // При смене серии HTML5 video сбрасывает playbackRate на 1.0, синхронизируем UI:
        Lampa.Storage.set('player_speed', 'default', true);
        updatePanelBadge('.player-panel__speed', '1x', true);
    }

    var ACTIONS = [
        {
            codes: [166, 427, 33, 892, 68],
            action: function () { switchEpisode(1); }
        },
        {
            codes: [167, 428, 28, 34, 893, 65],
            action: function () { switchEpisode(-1); }
        },
        {
            codes: [49, 97],
            action: function () { changeVideoSpeed(-1); }
        },
        {
            codes: [50, 98],
            action: function () { cycleVideoSize(); }
        },
        {
            codes: [51, 99],
            action: function () { changeVideoSpeed(1); }
        },
        {
            codes: [53, 101, 9],
            closeSelect: true,
            action: function () { Lampa.PlayerPlaylist.show(); }
        },
        {
            codes: [48, 96, 17],
            closeSelect: true,
            action: function () { triggerPanelButton('.player-panel__subs'); }
        },
        {
            codes: [56, 104],
            closeSelect: true,
            action: function () { triggerPanelButton('.player-panel__tracks'); }
        }
    ];

    var KEY_MAP = {};
    var CLOSE_MAP = {};

    for (var i = 0; i < ACTIONS.length; i++) {
        var item = ACTIONS[i];
        for (var j = 0; j < item.codes.length; j++) {
            var code = item.codes[j];
            KEY_MAP[code] = item.action;
            if (item.closeSelect) {
                CLOSE_MAP[code] = true;
            }
        }
    }

    function listenHotkeys(e) {
        if (e.repeat) return;

        var keyCode = e.keyCode;

        if (Lampa.Select.opened()) {
            if (CLOSE_MAP[keyCode]) {
                Lampa.Select.close();
                stopEvent(e);
            }
            return;
        }

        if (!isPlayerControllerActive()) return;

        var handler = KEY_MAP[keyCode];
        if (handler) {
            handler();
            stopEvent(e);
        }
    }

    function listenDestroy() {
        document.removeEventListener('keydown', listenHotkeys, true);
        if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
            Lampa.PlayerPanel.listener.remove('size', onPanelSizeChange);
            Lampa.PlayerPanel.listener.remove('speed', onPanelSpeedChange);
        }
        Lampa.Player.listener.remove('destroy', listenDestroy);
        Lampa.Storage.set('player_speed', 'default', true);
    }

    function startHotkeys() {
        Lampa.Storage.set('player_speed', 'default', true);

        var savedSize = Lampa.Storage.get('player_size', 'default');
        updatePanelBadge('.player-panel__size', String(savedSize).toUpperCase(), savedSize === 'default');
        updatePanelBadge('.player-panel__speed', '1x', true);

        if (Lampa.PlayerPanel && Lampa.PlayerPanel.listener) {
            Lampa.PlayerPanel.listener.remove('size', onPanelSizeChange);
            Lampa.PlayerPanel.listener.follow('size', onPanelSizeChange);
            Lampa.PlayerPanel.listener.remove('speed', onPanelSpeedChange);
            Lampa.PlayerPanel.listener.follow('speed', onPanelSpeedChange);
        }

        document.removeEventListener('keydown', listenHotkeys, true);
        document.addEventListener('keydown', listenHotkeys, true);
        Lampa.Player.listener.remove('destroy', listenDestroy);
        Lampa.Player.listener.follow('destroy', listenDestroy);

        console.log('Hotkeys', 'Hotkeys 2.1 listener started');
    }

    Lampa.Player.listener.follow('ready', startHotkeys);
})();
