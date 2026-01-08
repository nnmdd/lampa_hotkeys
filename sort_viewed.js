(function () {
    console.log('[SmartSort] Booting version 1.3...');

    // 1. Добавляем ключ перевода
    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed',
            uk: 'Сіди + Переглянуті'
        }
    });

    // 2. Функция самой сортировки
    function applySmartLogic(items) {
        console.log('[SmartSort] Sorting ' + items.length + ' items...');
        items.sort(function (a, b) {
            var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
            var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;

            if (vA !== vB) return vB - vA; // Просмотренные выше

            var sA = parseInt(a.seeders || a.seeds || 0);
            var sB = parseInt(b.seeders || b.seeds || 0);
            return sB - sA; // По сидам
        });
    }

    // 3. ПЕРЕХВАТ МЕНЮ (Самый важный этап)
    var originalSelect = Lampa.Select.show;
    Lampa.Select.show = function(params) {
        // Проверяем, что это меню выбора фильтра для торрентов
        if (params && params.items && params.items.some(function(i){ return i.base === 'seeders' || i.base === 'size'; })) {
            console.log('[SmartSort] Filter menu detected, injecting option...');
            
            // Проверяем, нет ли уже нашего пункта
            var hasSmart = params.items.some(function(i){ return i.base === 'custom_smart'; });
            
            if (!hasSmart) {
                params.items.push({
                    title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                    base: 'custom_smart'
                });
            }

            // Перехватываем выбор пункта
            var originalOnSelect = params.onSelect;
            params.onSelect = function(item) {
                if (item.base === 'custom_smart') {
                    console.log('[SmartSort] User selected Smart Sort!');
                    Lampa.Storage.set('torrent_filter', 'custom_smart');
                }
                originalOnSelect(item);
            };
        }
        originalSelect(params);
    };

    // 4. ПЕРЕХВАТ ДАННЫХ
    // Перехватываем глобальный метод сортировки массивов
    var originalSort = Lampa.Arrays.sort;
    Lampa.Arrays.sort = function(items, method) {
        var current = Lampa.Storage.get('torrent_filter', 'seeders');
        
        // Если вызван наш метод ИЛИ если метод 'seeders', но в базе стоит наш
        if (method === 'custom_smart' || (method === 'seeders' && current === 'custom_smart')) {
             // Проверяем, что это именно торренты (есть поле seeders)
             if (items && items.length && (items[0].seeders !== undefined || items[0].seeds !== undefined)) {
                 applySmartLogic(items);
                 return; // Отменяем стандартную сортировку
             }
        }
        return originalSort.apply(this, arguments);
    };

    // 5. ПОСТОЯННЫЙ МОНИТОРИНГ (на случай асинхронной загрузки)
    setInterval(function() {
        var current = Lampa.Storage.get('torrent_filter', 'seeders');
        if (current === 'custom_smart') {
            // Ищем открытый компонент торрентов и его элементы
            var activity = Lampa.Activity.active();
            if (activity && activity.component === 'torrent' && activity.items && !activity.smart_sorted) {
                console.log('[SmartSort] Background sort for active activity');
                applySmartLogic(activity.items);
                activity.smart_sorted = true; // Чтобы не сортировать в цикле
                if (activity.render) activity.render(); // Перерисовываем
            }
        }
    }, 1000);

    console.log('[SmartSort] All hooks injected successfully');
})();
