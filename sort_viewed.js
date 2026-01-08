(function () {
    console.log('[SmartSort] Target: torrents_view detected. Initializing...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    function start() {
        var originalView = Lampa.Component.get('torrents_view');

        Lampa.Component.add('torrents_view', function (object) {
            console.log('[SmartSort] torrents_view instance created');

            // 1. Внедряем фильтр в меню этого компонента
            if (object && object.filter) {
                var hasItem = object.filter.find(function (f) { return f.base === 'custom_smart'; });
                if (!hasItem) {
                    object.filter.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                    console.log('[SmartSort] Filter added to torrents_view');
                }
            }

            var comp = new originalView(object);

            // 2. Перехватываем метод обработки данных
            // В torrents_view это часто build или нативная сортировка внутри render
            var originalBuild = comp.buildSorted || comp.build;

            var smartSortLogic = function (items) {
                var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
                
                if (currentFilter === 'custom_smart' && items && Array.isArray(items)) {
                    console.log('[SmartSort] Applying logic to ' + items.length + ' torrents');
                    
                    items.sort(function (a, b) {
                        // Сначала просмотренные (Lampa хранит это глобально)
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                        if (vA !== vB) return vB - vA;

                        // Потом сиды
                        var sA = parseInt(a.seeders || a.seeds || a.seed || 0);
                        var sB = parseInt(b.seeders || b.seeds || b.seed || 0);
                        return sB - sA;
                    });
                }
            };

            // Подменяем buildSorted если он есть
            if (comp.buildSorted) {
                comp.buildSorted = function (items) {
                    smartSortLogic(items || comp.items);
                    return originalBuild.apply(this, arguments);
                };
            } 
            // Если нет buildSorted, внедряемся в render
            else {
                var originalRender = comp.render;
                comp.render = function () {
                    if (comp.items) smartSortLogic(comp.items);
                    return originalRender.apply(this, arguments);
                };
            }

            return comp;
        });

        // 3. Подстраховка через Select (меню выбора)
        var originalSelect = Lampa.Select.show;
        Lampa.Select.show = function(params) {
            if (params.items && params.items.some(function(i){ return i.base === 'seeders' || i.base === 'size'; })) {
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
                        // Находим активное окно и командуем обновиться
                        var activity = Lampa.Activity.active();
                        if (activity && activity.instance && activity.instance.render) {
                            if (activity.instance.items) smartSortLogic(activity.instance.items);
                            activity.instance.render();
                        }
                    }
                    if (originalOnSelect) originalOnSelect(item);
                };
            }
            originalSelect.apply(this, arguments);
        };

        console.log('[SmartSort] torrents_view hooks applied successfully');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
