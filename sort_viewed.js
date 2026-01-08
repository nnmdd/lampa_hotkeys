(function () {
    console.log('[SmartSort] Final Strategy: Controller Patching...');

    Lampa.Lang.add({
        torrent_sort_smart: {
            ru: 'Сиды + Просмотренные',
            en: 'Seeds + Viewed'
        }
    });

    function start() {
        // 1. ПЕРЕХВАТ КОМПОНЕНТА (на уровне конструктора)
        var originalTorrent = Lampa.Component.get('torrent');

        Lampa.Component.add('torrent', function (object) {
            console.log('[SmartSort] Main Container initialized');

            // Внедряем фильтр в объект, который управляет меню
            if (object && object.filter) {
                var hasItem = object.filter.find(function(f){ return f.base === 'custom_smart' });
                if (!hasItem) {
                    object.filter.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                    console.log('[SmartSort] Filter added to Main Container');
                }
            }

            var comp = new originalTorrent(object);

            // 2. ПЕРЕХВАТ buildSorted ВНУТРИ ЭКЗЕМПЛЯРА
            // Этот метод отвечает за пересборку списка перед отрисовкой
            var originalBuild = comp.buildSorted;
            comp.buildSorted = function (items) {
                var currentFilter = Lampa.Storage.get('torrent_filter', 'seeders');
                
                if (currentFilter === 'custom_smart') {
                    var list = items || comp.items || [];
                    console.log('[SmartSort] Logic applied to ' + list.length + ' items');

                    list.sort(function (a, b) {
                        var vA = Lampa.Arrays.isViewed(a) ? 1 : 0;
                        var vB = Lampa.Arrays.isViewed(b) ? 1 : 0;
                        if (vA !== vB) return vB - vA;
                        
                        var sA = parseInt(a.seeders || a.seeds || 0);
                        var sB = parseInt(b.seeders || b.seeds || 0);
                        return sB - sA;
                    });

                    if (comp.render) comp.render();
                    return; 
                }
                return originalBuild.apply(this, arguments);
            };

            return comp;
        });

        // 3. ПЕРЕХВАТ SELECT (Для гарантированного появления в меню)
        var originalSelect = Lampa.Select.show;
        Lampa.Select.show = function(params) {
            // Если это меню фильтрации (проверяем по наличию знакомых ключей)
            if (params.items && params.items.some(function(i){ return i.base === 'seeders'; })) {
                if (!params.items.find(function(i){ return i.base === 'custom_smart' })) {
                    params.items.push({
                        title: Lampa.Lang.translate('torrent_sort_smart') + ' +',
                        base: 'custom_smart'
                    });
                }
                
                // Подменяем обработчик выбора
                var originalOnSelect = params.onSelect;
                params.onSelect = function(item) {
                    if (item.base === 'custom_smart') {
                        Lampa.Storage.set('torrent_filter', 'custom_smart');
                        // Находим активный компонент и заставляем его пересортировать
                        var activity = Lampa.Activity.active();
                        if (activity && activity.instance && activity.instance.buildSorted) {
                            activity.instance.buildSorted();
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
