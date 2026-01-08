(function () {
    console.log('[SmartSort] Interface interceptor started');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    function start() {
        // 1. ПЕРЕХВАТ МЕНЮ ВЫБОРА (SELECT)
        // Это сработает, когда вы нажмете на кнопку сортировки в торрентах
        var originalSelect = Lampa.Select.show;
        Lampa.Select.show = function(params) {
            // Проверяем, что это меню сортировки торрентов (ищем ключевые слова)
            var isTorrentSort = params.items && params.items.some(function(i){ 
                return i.base === 'seeders' || i.base === 'size' || i.base === 'title'; 
            });

            if (isTorrentSort) {
                console.log('[SmartSort] Torrent sort menu detected!');
                
                // Добавляем наш пункт, если его еще нет
                if (!params.items.find(function(i){ return i.base === 'custom_smart' })) {
                    params.items.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                }

                // Перехватываем событие выбора
                var originalOnSelect = params.onSelect;
                params.onSelect = function(item) {
                    if (item.base === 'custom_smart') {
                        console.log('[SmartSort] User selected custom sort');
                        Lampa.Storage.set('torrent_filter', 'custom_smart');
                        
                        // Пытаемся мгновенно пересортировать активное окно
                        runManualSort();
                    }
                    if (originalOnSelect) originalOnSelect(item);
                };
            }
            originalSelect.apply(this, arguments);
        };

        // 2. ФУНКЦИЯ РУЧНОЙ СОРТИРОВКИ
        function runManualSort() {
            var activity = Lampa.Activity.active();
            // Проверяем, открыто ли сейчас окно с торрентами
            if (activity && activity.component === 'torrent') {
                var items = activity.items || (activity.instance && activity.instance.items);
                
                if (items && Array.isArray(items)) {
                    console.log('[SmartSort] Manual sorting of active activity...');
                    items.sort(function (a, b) {
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                        if (vA !== vB) return vB - vA;

                        var sA = parseInt(a.seeders || a.seeds || 0);
                        var sB = parseInt(b.seeders || b.seeds || 0);
                        return sB - sA;
                    });

                    // Заставляем компонент перерисоваться
                    if (activity.instance && activity.instance.render) activity.instance.render();
                    else if (activity.render) activity.render();
                }
            }
        }

        // 3. ПЕРЕХВАТ ГЛОБАЛЬНОЙ СОРТИРОВКИ
        var originalSort = Lampa.Arrays.sort;
        Lampa.Arrays.sort = function(items, method) {
            var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
            
            if (method === 'custom_smart' || (currentFilter === 'custom_smart' && method === 'seeders')) {
                console.log('[SmartSort] Global Arrays.sort triggered');
                
                items.sort(function (a, b) {
                    var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                    var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                    if (vA !== vB) return vB - vA;
                    return parseInt(b.seeders || 0) - parseInt(a.seeders || 0);
                });
                return; // Прерываем стандартную сортировку
            }
            return originalSort.apply(this, arguments);
        };

        console.log('[SmartSort] All interface hooks ready');
    }

    if (window.appready) start();
    else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') start(); });
})();
