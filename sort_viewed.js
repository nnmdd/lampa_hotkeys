(function () {
    console.log('[SmartSort] Plugin initialization started');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        var originalTorrent = Lampa.Component.get('torrent');

        Lampa.Component.add('torrent', function (object) {
            console.log('[SmartSort] Torrent component initialized', object);

            // Добавляем наш пункт в фильтр
            if (object.filter) {
                var hasSmartSort = object.filter.some(function(f) { return f.base === 'custom_smart'; });
                if (!hasSmartSort) {
                    object.filter.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart',
                        active: false
                    });
                    console.log('[SmartSort] Custom filter item added to menu');
                }
            }

            var comp = new originalTorrent(object);
            var originalOnRecived = comp.onRecived;

            comp.onRecived = function (items) {
                // Получаем текущий фильтр из хранилища Lampa
                var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
                console.log('[SmartSort] Data received. Current filter:', currentFilter);
                console.log('[SmartSort] Items count:', items ? items.length : 0);

                if (currentFilter === 'custom_smart' && items && Array.isArray(items)) {
                    console.log('[SmartSort] Applying smart sorting logic...');

                    items.sort(function (a, b) {
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

                        // Сначала просмотренные
                        if (vA !== vB) {
                            return vB - vA; 
                        }

                        // Затем по сидам
                        var sA = parseInt(a.seeders || a.seeds || 0);
                        var sB = parseInt(b.seeders || b.seeds || 0);
                        return sB - sA;
                    });

                    console.log('[SmartSort] Sorting complete. First item now:', items[0] ? items[0].title : 'none');
                } else {
                    console.log('[SmartSort] Smart sorting skipped (filter not active or no items)');
                }

                return originalOnRecived.apply(this, [items]);
            };

            return comp;
        });
        
        console.log('[SmartSort] Component "torrent" successfully wrapped');
    }

    if (window.appready) {
        start();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
