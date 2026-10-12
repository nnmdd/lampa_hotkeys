(function () {
    'use strict';

    var STORAGE_KEY = 'torrents_viewed_on_top';

    function isViewedOnTopEnabled() {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw === null || raw === undefined || raw === '') return true;
        return raw === 'true';
    }

    function setViewedOnTopEnabled(enabled) {
        var val = enabled ? 'true' : 'false';
        window.localStorage.setItem(STORAGE_KEY, val);
        if (window.Lampa && Lampa.Storage) {
            Lampa.Storage.set(STORAGE_KEY, val);
        }
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

        function isTorrentViewed(item) {
            if (!item) return false;
            if (item.viewed) return true;

            var viewedList = Lampa.Storage.cache('torrents_view', 5000, []);
            var hash = item.hash || (item.Title ? Lampa.Utils.hash(item.Title) : '');

            if (hash && viewedList.indexOf(hash) !== -1) {
                item.viewed = true;
                return true;
            }
            return false;
        }

        // 1. Перехватываем Lampa.Parser.get, чтобы получить ссылку на объект results (data.Results)
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
                    var data = object && object._torrents_results;
                    if (!data || !Array.isArray(data.Results)) return;

                    if (!isViewedOnTopEnabled()) {
                        if (typeof origSortWithPopular === 'function') {
                            origSortWithPopular.apply(comp, arguments);
                        }
                        return;
                    }

                    var viewedItems = [];
                    var otherItems = [];

                    for (var i = 0; i < data.Results.length; i++) {
                        var item = data.Results[i];
                        if (isTorrentViewed(item)) {
                            viewedItems.push(item);
                        } else {
                            otherItems.push(item);
                        }
                    }

                    var currentSort = Lampa.Storage.get('torrents_sort', 'popular');
                    if (currentSort === 'viewed') {
                        viewedItems.sort(function (a, b) {
                            return (b.Seeders || 0) - (a.Seeders || 0);
                        });
                    }

                    var combined = viewedItems.concat(otherItems);
                    data.Results.length = 0;
                    Array.prototype.push.apply(data.Results, combined);
                }

                comp.sortWithViewed = customSortWithViewed;
                comp.sortWithPopular = customSortWithViewed;

                if (typeof comp.sortResults !== 'function') {
                    comp.sortResults = function (need) {
                        var data = object && object._torrents_results;
                        if (data && Array.isArray(data.Results)) {
                            var sortKey = need === 'popular' ? 'Seeders' : need;
                            data.Results.sort(function (c, b) {
                                if (c[sortKey] < b[sortKey]) return 1;
                                if (c[sortKey] > b[sortKey]) return -1;
                                return 0;
                            });
                        }
                        customSortWithViewed();
                    };
                }

                comp._resortByPlugin = function (activeSortKey) {
                    var currentSort = activeSortKey || Lampa.Storage.get('torrents_sort', 'popular');
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

        // 3. Добавляем чекбокс в меню сортировки торрентов
        function injectSortMenuOption(active) {
            if (!active || !Array.isArray(active.items)) return;

            var isTorrentSortMenu = active.items.some(function (item) {
                return item && (item.sort === 'Seeders' || item.sort === 'PublisTime');
            });

            if (!isTorrentSortMenu) return;

            var existingToggle = active.items.find(function (item) {
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

                        var selectedSortItem = active.items.find(function (i) {
                            return i && i.sort && i.selected;
                        });
                        var sortKey = selectedSortItem ? selectedSortItem.sort : Lampa.Storage.get('torrents_sort', 'popular');

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
