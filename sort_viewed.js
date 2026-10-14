(function () {
    'use strict';

    var STORAGE_KEY = 'torrents_viewed_on_top';

    function isViewedOnTopEnabled() {
        if (window.Lampa && Lampa.Storage) {
            var val = Lampa.Storage.get(STORAGE_KEY, 'true');
            return val === true || val === 'true';
        }
        try {
            var raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw === null || raw === undefined || raw === '') return true;
            return raw === 'true';
        } catch (e) {
            return true;
        }
    }

    function setViewedOnTopEnabled(enabled) {
        var val = enabled ? 'true' : 'false';
        if (window.Lampa && Lampa.Storage) {
            Lampa.Storage.set(STORAGE_KEY, val);
        }
        try {
            window.localStorage.setItem(STORAGE_KEY, val);
        } catch (e) {}
    }

    // ES5-совместимая замена Array.prototype.find (для WebOS 3.x / Orsay)
    function findInArray(arr, predicate) {
        if (!Array.isArray(arr)) return null;
        for (var i = 0; i < arr.length; i++) {
            if (predicate(arr[i], i)) return arr[i];
        }
        return null;
    }

    function initPlugin() {
        if (window.lampa_sort_viewed_plugin) return;
        window.lampa_sort_viewed_plugin = true;

        Lampa.Lang.add({
            torrent_viewed_on_top_title: {
                ru: 'Опции',
                en: 'Options',
                uk: 'Опції'
            },
            torrent_viewed_on_top: {
                ru: 'Просмотренные сверху',
                en: 'Viewed on top',
                uk: 'Переглянуті зверху'
            }
        });

        var activeTorrentsComp = null;

        // Строим O(1) хеш-карту просмотренных торрентов один раз перед сортировкой
        function buildViewedMap() {
            var viewedList = Lampa.Storage.cache('torrents_view', 5000, []);
            var map = {};
            if (Array.isArray(viewedList)) {
                for (var i = 0; i < viewedList.length; i++) {
                    map[viewedList[i]] = true;
                }
            }
            return map;
        }

        function checkItemViewed(item, viewedMap) {
            if (!item) return false;
            if (item.viewed) return true;

            var hash = item.hash || (item.Title ? Lampa.Utils.hash(item.Title) : '');
            if (hash && viewedMap[hash]) {
                item.viewed = true;
                return true;
            }
            return false;
        }

        // 1. Перехватываем Lampa.Parser.get, чтобы сохранить ссылку на data.Results
        if (Lampa.Parser && typeof Lampa.Parser.get === 'function') {
            var origParserGet = Lampa.Parser.get;

            Lampa.Parser.get = function (params, oncomplite, onerror) {
                return origParserGet.call(this, params, function (data) {
                    if (params && typeof params === 'object') {
                        params._torrents_results = data;
                    }
                    if (oncomplite) oncomplite(data);
                }, onerror);
            };
        }

        // 2. Оборачиваем компонент 'torrents'
        var origTorrents = Lampa.Component.get('torrents');

        if (origTorrents) {
            Lampa.Component.add('torrents', function (object) {
                var comp = new origTorrents(object);
                activeTorrentsComp = comp;

                var origSortWithPopular = comp.sortWithPopular;

                function customSortWithViewed() {
                    // Сначала даем отработать штатной сортировке популярных (если она есть)
                    if (typeof origSortWithPopular === 'function') {
                        origSortWithPopular.apply(comp, arguments);
                    }

                    if (!isViewedOnTopEnabled()) return;

                    var data = object && object._torrents_results;
                    if (!data || !Array.isArray(data.Results) || !data.Results.length) return;

                    var viewedMap = buildViewedMap();
                    var viewedItems = [];
                    var otherItems = [];

                    for (var i = 0; i < data.Results.length; i++) {
                        var item = data.Results[i];
                        if (checkItemViewed(item, viewedMap)) {
                            viewedItems.push(item);
                        } else {
                            otherItems.push(item);
                        }
                    }

                    if (!viewedItems.length) return;

                    var currentSort = Lampa.Storage.get('torrents_sort', 'Seeders');
                    // Если выбрана штатная сортировка "По просмотренным", ранжируем обе группы по сидам
                    if (currentSort === 'viewed') {
                        viewedItems.sort(function (a, b) {
                            return (b.Seeders || 0) - (a.Seeders || 0);
                        });
                        otherItems.sort(function (a, b) {
                            return (b.Seeders || 0) - (a.Seeders || 0);
                        });
                    }

                    var k = 0;
                    for (var v = 0; v < viewedItems.length; v++) {
                        data.Results[k++] = viewedItems[v];
                    }
                    for (var o = 0; o < otherItems.length; o++) {
                        data.Results[k++] = otherItems[o];
                    }
                }

                comp.sortWithViewed = customSortWithViewed;
                comp.sortWithPopular = customSortWithViewed;

                if (typeof comp.sortResults !== 'function') {
                    comp.sortResults = function (need) {
                        var data = object && object._torrents_results;
                        if (data && Array.isArray(data.Results)) {
                            var sortKey = (need === 'popular' || need === 'viewed' || !need) ? 'Seeders' : need;
                            data.Results.sort(function (c, b) {
                                var valC = c[sortKey] || 0;
                                var valB = b[sortKey] || 0;
                                if (valC < valB) return 1;
                                if (valC > valB) return -1;
                                return 0;
                            });
                        }
                        customSortWithViewed();
                    };
                }

                comp._resortByPlugin = function (activeSortKey) {
                    var currentSort = activeSortKey || Lampa.Storage.get('torrents_sort', 'Seeders');
                    if (typeof comp.sortResults === 'function') {
                        comp.sortResults(currentSort);
                    }
                    if (typeof comp.applyFilter === 'function') {
                        comp.applyFilter();
                    }
                };

                var origDestroy = comp.destroy;
                comp.destroy = function () {
                    if (activeTorrentsComp === comp) {
                        activeTorrentsComp = null;
                    }
                    if (origDestroy) return origDestroy.apply(this, arguments);
                };

                return comp;
            });
        }

        // 3. Инжектим чекбокс в меню сортировки торрентов
        function injectSortMenuOption(active) {
            if (!active || !Array.isArray(active.items)) return;

            var isTorrentSortMenu = Boolean(findInArray(active.items, function (item) {
                return item && (item.sort === 'Seeders' || item.sort === 'PublisTime');
            }));

            if (!isTorrentSortMenu) return;

            var existingToggle = findInArray(active.items, function (item) {
                return item && item.viewed_top_toggle;
            });

            if (!existingToggle) {
                active.items.push({
                    title: Lampa.Lang.translate('torrent_viewed_on_top_title'),
                    separator: true,
                    viewed_top_separator: true
                });

                active.items.push({
                    title: Lampa.Lang.translate('torrent_viewed_on_top'),
                    checkbox: true,
                    checked: isViewedOnTopEnabled(),
                    noselect: true,
                    viewed_top_toggle: true,
                    onCheck: function (item) {
                        setViewedOnTopEnabled(Boolean(item.checked));

                        var selectedSortItem = findInArray(active.items, function (i) {
                            return i && i.sort && i.selected;
                        });
                        var sortKey = selectedSortItem ? selectedSortItem.sort : Lampa.Storage.get('torrents_sort', 'Seeders');

                        if (activeTorrentsComp && typeof activeTorrentsComp._resortByPlugin === 'function') {
                            activeTorrentsComp._resortByPlugin(sortKey);
                        }
                    }
                });
            } else {
                existingToggle.checked = isViewedOnTopEnabled();
            }
        }

        if (Lampa.Select && Lampa.Select.listener) {
            Lampa.Select.listener.follow('preshow', function (e) {
                if (e && e.active) injectSortMenuOption(e.active);
            });
        } else if (Lampa.Select && typeof Lampa.Select.show === 'function') {
            var origSelectShow = Lampa.Select.show;
            Lampa.Select.show = function (params) {
                injectSortMenuOption(params);
                return origSelectShow.apply(this, arguments);
            };
        }
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }
})();
