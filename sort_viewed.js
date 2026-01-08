(function () {
    console.log('[SmartSort] Explorer-mode detected. Injecting...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    // 1. Функция "умной" сортировки массива
    function sortItems(items) {
        if (!items || !Array.isArray(items)) return items;
        
        console.log('[SmartSort] Sorting ' + items.length + ' files in Explorer');
        
        return items.sort(function (a, b) {
            // Приоритет 1: Просмотренные
            var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
            var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
            if (vA !== vB) return vB - vA;

            // Приоритет 2: Сиды
            var sA = parseInt(a.seeders || a.seeds || a.seed || 0);
            var sB = parseInt(b.seeders || b.seeds || b.seed || 0);
            return sB - sA;
        });
    }

    function start() {
        // 2. Перехватываем создание компонента (вероятно, это torrents_view или explorer)
        var targetNames = ['torrents_view', 'torrent', 'explorer'];
        
        targetNames.forEach(function(name) {
            var original = Lampa.Component.get(name);
            if (!original) return;

            Lampa.Component.add(name, function (object) {
                // Внедряем кнопку в настройки фильтра
                if (object && object.filter) {
                    var hasItem = object.filter.find(function(f){ return f.base === 'custom_smart' });
                    if (!hasItem) {
                        object.filter.push({
                            title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                            base: 'custom_smart'
                        });
                    }
                }

                var comp = new original(object);

                // Перехватываем рендер — самое надежное место в Explorer
                var originalRender = comp.render;
                comp.render = function() {
                    var filter = Lampa.Storage.get('torrent_filter', 'seeders');
                    if (filter === 'custom_smart' && comp.items) {
                        sortItems(comp.items);
                    }
                    return originalRender.apply(this, arguments);
                };

                return comp;
            });
        });

        // 3. Перехват всплывающего меню Select (где и живут настройки сортировки)
        var originalSelect = Lampa.Select.show;
        Lampa.Select.show = function(params) {
            // Если в меню есть намеки на файлы или торренты
            var isTargetMenu = params.items && params.items.some(function(i) {
                return i.base === 'seeders' || i.base === 'size' || i.base === 'stat';
            });

            if (isTargetMenu) {
                console.log('[SmartSort] Explorer filter menu detected');
                
                if (!params.items.find(function(i){ return i.base === 'custom_smart' })) {
                    params.items.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                }

                var originalOnSelect = params.onSelect;
                params.onSelect = function(item) {
                    if (item.base === 'custom_smart') {
                        Lampa.Storage.set('torrent_filter', 'custom_smart');
                        // Сразу после выбора командуем активному компоненту перерисоваться
                        var activity = Lampa.Activity.active();
                        if (activity && activity.instance) {
                            if (activity.instance.items) sortItems(activity.instance.items);
                            if (activity.instance.render) activity.instance.render();
                        }
                    }
                    if (originalOnSelect) originalOnSelect(item);
                };
            }
            originalSelect.apply(this, arguments);
        };
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
