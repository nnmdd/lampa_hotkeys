(function () {
    console.log('[SmartSort] Universal Trigger Loading...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    // 1. ФУНКЦИЯ ПРИНУДИТЕЛЬНОЙ СОРТИРОВКИ
    function applySmartSort() {
        var activity = Lampa.Activity.active();
        if (!activity || activity.component !== 'torrent') return;

        // Пытаемся найти массив данных в недрах активного окна
        var items = activity.items || (activity.instance && activity.instance.items);

        if (items && Array.isArray(items) && items.length > 0) {
            console.log('[SmartSort] Sorting active list: ' + items.length + ' items');
            
            items.sort(function (a, b) {
                var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                if (vA !== vB) return vB - vA; // Просмотренные вверх

                var sA = parseInt(a.seeders || a.seeds || 0);
                var sB = parseInt(b.seeders || b.seeds || 0);
                return sB - sA; // По сидам
            });

            // Заставляем интерфейс обновиться
            if (activity.instance && activity.instance.render) activity.instance.render();
            else if (activity.render) activity.render();
        }
    }

    // 2. ВНЕДРЕНИЕ В ЛЮБОЕ МЕНЮ (SELECT)
    var originalSelect = Lampa.Select.show;
    Lampa.Select.show = function(params) {
        // Проверяем, похоже ли меню на сортировку торрентов
        var isTorrentMenu = params.items && params.items.some(function(i) {
            return i.base === 'seeders' || i.base === 'size' || i.base === 'title';
        });

        if (isTorrentMenu) {
            console.log('[SmartSort] Sort menu detected!');
            // Добавляем наш пункт
            if (!params.items.find(function(i) { return i.base === 'custom_smart' })) {
                params.items.push({
                    title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                    base: 'custom_smart'
                });
            }

            // Перехватываем выбор
            var originalOnSelect = params.onSelect;
            params.onSelect = function(item) {
                if (item.base === 'custom_smart') {
                    console.log('[SmartSort] Custom filter activated');
                    Lampa.Storage.set('torrent_filter', 'custom_smart');
                    setTimeout(applySmartSort, 100); // Сортируем с небольшой задержкой после закрытия меню
                }
                if (originalOnSelect) originalOnSelect(item);
            };
        }
        originalSelect.apply(this, arguments);
    };

    // 3. АВТО-ЗАПУСК ПРИ ОТКРЫТИИ
    // Если в настройках уже стоит наш фильтр, сортируем сразу при входе в торренты
    Lampa.Listener.follow('activity', function (e) {
        if (e.type === 'start' && e.component === 'torrent') {
            console.log('[SmartSort] Torrent activity started');
            if (Lampa.Storage.get('torrent_filter') === 'custom_smart') {
                // Ждем немного, пока данные загрузятся
                setTimeout(applySmartSort, 1000);
                setTimeout(applySmartSort, 3000); // Повтор для медленных источников
            }
        }
    });

    // 4. ГЛОБАЛЬНЫЙ ХУК НА МАССИВЫ (Последний рубеж)
    var originalSort = Lampa.Arrays.sort;
    Lampa.Arrays.sort = function(items, method) {
        if (method === 'custom_smart' || (method === 'seeders' && Lampa.Storage.get('torrent_filter') === 'custom_smart')) {
            if (items && items.length && (items[0].seeders !== undefined || items[0].seeds !== undefined)) {
                console.log('[SmartSort] Global sort intercept');
                items.sort(function (a, b) {
                    var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                    var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                    if (vA !== vB) return vB - vA;
                    return parseInt(b.seeders || 0) - parseInt(a.seeders || 0);
                });
                return;
            }
        }
        return originalSort.apply(this, arguments);
    };

    console.log('[SmartSort] Universal Trigger Ready');
})();
