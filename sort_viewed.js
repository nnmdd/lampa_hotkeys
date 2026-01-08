(function () {
    console.log('[SmartSort] Deep Intercept Version Loading...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    // 1. ПРИНУДИТЕЛЬНАЯ СОРТИРОВКА
    function forceSort() {
        var activity = Lampa.Activity.active();
        if (activity && activity.component === 'torrent') {
            var comp = activity.instance;
            var items = (comp && comp.items) || activity.items;

            if (items && Array.isArray(items)) {
                console.log('[SmartSort] Executing sorting logic...');
                items.sort(function (a, b) {
                    var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                    var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                    if (vA !== vB) return vB - vA;
                    
                    var sA = parseInt(a.seeders || a.seeds || 0);
                    var sB = parseInt(b.seeders || b.seeds || 0);
                    return sB - sA;
                });
                
                // Перерисовываем UI
                if (comp && comp.render) comp.render();
                else if (activity.render) activity.render();
            }
        }
    }

    // 2. ГЛОБАЛЬНЫЙ ПЕРЕХВАТ ШАБЛОНОВ (Внедряем кнопку в UI)
    var originalGet = Lampa.Template.get;
    Lampa.Template.get = function (name, vars) {
        var tpl = originalGet.apply(this, arguments);
        
        // Если Lampa пытается отрисовать пункт фильтра
        if (name === 'filter_item' || name === 'select_item') {
            // Проверяем, не наш ли это пункт
            if (vars && vars.base === 'custom_smart') {
                 tpl.addClass('smart-sort-item').css('color', '#ffeb3b');
            }
        }
        return tpl;
    };

    // 3. ВНЕДРЕНИЕ В КОМПОНЕНТ ЧЕРЕЗ LISTENER (Каждый раз при открытии торрентов)
    Lampa.Listener.follow('torrent', function (e) {
        if (e.type === 'render' || e.type === 'ready') {
            console.log('[SmartSort] Torrent component detected via Listener');
            
            var object = e.object;
            if (object && object.filter) {
                var hasItem = object.filter.find(function(f){ return f.base === 'custom_smart' });
                if (!hasItem) {
                    // Вставляем наш метод в начало списка фильтров
                    object.filter.unshift({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                    console.log('[SmartSort] Filter pushed into object.filter');
                }
            }
        }
    });

    // 4. ПЕРЕХВАТ КЛИКА ПО ФИЛЬТРУ
    // Следим за изменением хранилища
    setInterval(function(){
        var current = Lampa.Storage.get('torrent_filter');
        if (current === 'custom_smart') {
            var activity = Lampa.Activity.active();
            if (activity && activity.component === 'torrent' && !activity._smart_applied) {
                forceSort();
                activity._smart_applied = true; // Чтобы не зацикливаться
            }
        } else {
            // Сбрасываем флаг, если выбрали другой фильтр
            var activity = Lampa.Activity.active();
            if (activity) activity._smart_applied = false;
        }
    }, 1000);

    // 5. ПОДМЕНА МЕТОДА СОРТИРОВКИ (Для фоновых процессов)
    var originalSort = Lampa.Arrays.sort;
    Lampa.Arrays.sort = function(items, method) {
        if (method === 'custom_smart') {
            items.sort(function (a, b) {
                var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                if (vA !== vB) return vB - vA;
                return parseInt(b.seeders || 0) - parseInt(a.seeders || 0);
            });
            return;
        }
        return originalSort.apply(this, arguments);
    };

    console.log('[SmartSort] Deep Intercept Ready. Open Torrents and check Filter menu.');
})();
