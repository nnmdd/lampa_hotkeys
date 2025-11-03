Lampa.Platform.tv();

function log(...args) {
    console.log('Hotkeys:', ...args);
}

function openPanel(elementSelector) {
    const el = document.querySelector(elementSelector);
    if (!el) {
        log('Error', `Element not found: ${elementSelector}`);
        return;
    }
    
    if (parseFloat(Lampa.Manifest.app_version) >= 1.7) {
        Lampa.Utils.trigger(el, 'click');
    } else {
        el.click();
    }
};

function listenDestroy() {
    document.removeEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.remove('destroy', listenDestroy);    
};

function startHotkeys() {
    document.addEventListener("keydown", listenHotkeys);
    Lampa.Player.listener.follow('destroy', listenDestroy);
    log('Hotkeys', 'Hotkeys listener started');
};

const ALL_ACTIONS = {
    next: {
        codes: [166, 427, 27, 33, 892, 68], 
        selector: '.player-panel__next.button.selector'
    },
    prev: {
        codes: [167, 428, 28, 34, 893, 65], 
        selector: '.player-panel__prev.button.selector'
    },
    subs: {
        codes: [48, 96, 17], 
        selector: '.player-panel__subs.button.selector'
    },
    playlist: {
        codes: [53, 101, 9], 
        selector: '.player-panel__playlist.button.selector'
    },
    tracks: {
        codes: [56, 104], 
        selector: '.player-panel__tracks.button.selector'
    }
};

const CLOSE_KEYS = [
    ...ALL_ACTIONS.subs.codes, 
    ...ALL_ACTIONS.playlist.codes, 
    ...ALL_ACTIONS.tracks.codes
];

function listenHotkeys(e) {
    const keyCode = e.keyCode;

    if (document.querySelector('body.selectbox--open')) {
        
        if (CLOSE_KEYS.includes(keyCode)) {
            history.back();
            
            e.preventDefault(); 
            e.stopPropagation();
            return;
        }
        
        return;
    }

    for (const action of Object.values(ALL_ACTIONS)) {
        if (action.codes.includes(keyCode)) {
            openPanel(action.selector);
            
            e.preventDefault();
            e.stopPropagation();
            return;
        }
    }
};

Lampa.Player.listener.follow('ready', startHotkeys);
