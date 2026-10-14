(function () {
    'use strict';

    // Определяем адрес локального TorrServer (обычно совпадает с хостом, откуда запущена Lampa, или стандартный порт 8090)
    var getTorrServerHost = function () {
        if (window.TorrServer && typeof window.TorrServer.ip === 'string') {
            return window.TorrServer.ip;
        }
        return window.location.protocol + '//' + (window.location.hostname || '127.0.0.1') + ':8090';
    };

    function requestStreamMeta(params, callback) {
        if (!params) return function () {};

        var ext = params.path ? params.path.split('.').pop().toLowerCase() : '';
        
        // Если это mp4 или передан локальный ffprb-кэш, не гоняем сеть
        if (params.ffprobe && ext !== 'mp4') {
            var timer = setTimeout(function () {
                callback({ streams: params.ffprobe });
            }, 100);
            return function () { clearTimeout(timer); };
        }

        // Если есть hash торрента и id файла, пробуем запросить метаданные из локального API TorrServer
        if (params.torrent_hash && params.id !== undefined) {
            var baseUrl = getTorrServerHost();
            var apiUrl = baseUrl + '/stream/ee'; // или стандартный метод получения информации о торренте

            var xhr = $.ajax({
                url: apiUrl,
                type: 'POST',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    hash: params.torrent_hash,
                    id: String(params.id)
                }),
                timeout: 3000,
                success: function (res) {
                    if (res && Array.isArray(res.streams)) {
                        callback(res);
                    } else {
                        callback({ streams: [] });
                    }
                },
                error: function () {
                    // Fallback: если бэкенд недоступен, отдаем пустой массив, 
                    // плеер переключится на нативный парсинг HTML5 (<video>)
                    callback({ streams: [] });
                }
            });

            return function () {
                if (xhr && xhr.abort) xhr.abort();
            };
        }

        callback({ streams: [] });
        return function () {};
    }

    function getTrackLabel(track, fallbackPrefix, index) {
        var tags = track.tags || {};
        var title = tags.title || tags.handler_name || '';
        if (/^(Sound|Video|Subtitle|Media|GPAC|ISO).*Handler$/i.test(title)) {
            title = '';
        }
        if (!title) {
            var codec = track.codec_name ? track.codec_name.toUpperCase() : '';
            title = fallbackPrefix + ' ' + (index + 1) + (codec ? ' (' + codec + ')' : '');
        }
        return title;
    }

    function getTrackLang(track) {
        return (track.tags && track.tags.language) ? track.tags.language : '';
    }

    function alignStreamsWithPlayer(streams, playerLength, unsupportedCodecs) {
        var result = streams.slice();
        if (playerLength > 0 && result.length > playerLength) {
            for (var c = 0; c < unsupportedCodecs.length; c++) {
                var badCodec = unsupportedCodecs[c];
                if (result.length > playerLength) {
                    result = result.filter(function (a) {
                        return a.codec_name !== badCodec;
                    });
                }
            }
        }
        return result;
    }

    function subscribeTracks(data) {
        var inited = false;
        var inited_parse = false;
        var webos_replace = {};
        var abortRequest = null;
        var retryTimer = null;
        var retryCount = 0;

        function log() {
            console.log.apply(console.log, arguments);
        }

        function getTracks() {
            var video = Lampa.PlayerVideo.video();
            return (video && video.audioTracks) ? video.audioTracks : [];
        }

        function getSubs() {
            var video = Lampa.PlayerVideo.video();
            return (video && video.textTracks) ? video.textTracks : [];
        }

        log('Tracks', 'start (local/native mode)');

        function setTracks() {
            var video_tracks = getTracks();

            // Если внешний парсер не дал данных, используем нативные дорожки плеера напрямую
            if (!inited_parse || !Array.isArray(inited_parse.streams) || inited_parse.streams.length === 0) {
                if (video_tracks.length > 0) {
                    var native_tracks = [];
                    for (var ni = 0; ni < video_tracks.length; ni++) {
                        var n_tr = video_tracks[ni];
                        native_tracks.push({
                            index: ni,
                            language: n_tr.language || '',
                            label: n_tr.label || ('Audio ' + (ni + 1)),
                            ghost: false,
                            selected: n_tr.selected === true || n_tr.enabled === true
                        });
                    }
                    Lampa.PlayerPanel.setTracks(native_tracks);
                }
                return;
            }

            if (webos_replace.tracks) {
                setWebosTracks(webos_replace.tracks);
                return;
            }

            var new_tracks = [];
            var parse_tracks = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });

            parse_tracks = alignStreamsWithPlayer(parse_tracks, video_tracks.length, ['truehd', 'dts', 'mlp']);

            parse_tracks.forEach(function (track, idx) {
                var orig = video_tracks[idx];
                var isSelected = orig ? (orig.selected === true || orig.enabled === true) : false;

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Audio', idx),
                    ghost: !orig,
                    selected: isSelected
                };

                Object.defineProperty(elem, 'enabled', {
                    set: function (v) {
                        elem.selected = Boolean(v);
                        if (v) {
                            var aud = getTracks();
                            var trk = aud[elem.index];

                            for (var i = 0; i < aud.length; i++) {
                                aud[i].enabled = false;
                                aud[i].selected = false;
                            }

                            if (trk) {
                                trk.enabled = true;
                                trk.selected = true;
                            }
                        }
                    },
                    get: function () {
                        return elem.selected;
                    }
                });

                new_tracks.push(elem);
            });

            if (new_tracks.length) Lampa.PlayerPanel.setTracks(new_tracks);
        }

        function setSubs() {
            var video_subs = getSubs();

            if (!inited_parse || !Array.isArray(inited_parse.streams) || inited_parse.streams.length === 0) {
                if (video_subs.length > 0) {
                    var native_subs = [];
                    for (var nj = 0; nj < video_subs.length; nj++) {
                        var n_sub = video_subs[nj];
                        native_subs.push({
                            index: nj,
                            language: n_sub.language || '',
                            label: n_sub.label || ('Subtitle ' + (nj + 1)),
                            ghost: false,
                            selected: n_sub.selected === true || n_sub.mode === 'showing'
                        });
                    }
                    Lampa.PlayerPanel.setSubs(native_subs);
                }
                return;
            }

            if (webos_replace.subs) {
                setWebosSubs(webos_replace.subs);
                return;
            }

            var new_subs = [];
            var parse_subs = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            parse_subs = alignStreamsWithPlayer(parse_subs, video_subs.length, ['hdmv_pgs_subtitle', 'dvd_subtitle']);

            parse_subs.forEach(function (track, idx) {
                var orig = video_subs[idx];
                var isSelected = orig ? (orig.selected === true || orig.mode === 'showing') : false;

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Subtitles', idx),
                    ghost: !orig,
                    selected: isSelected
                };

                Object.defineProperty(elem, 'mode', {
                    set: function (v) {
                        elem.selected = Boolean(v && v !== 'disabled');
                        if (v) {
                            var txt = getSubs();
                            var sub = txt[elem.index];

                            for (var i = 0; i < txt.length; i++) {
                                txt[i].mode = 'disabled';
                                txt[i].selected = false;
                            }

                            if (sub) {
                                sub.mode = 'showing';
                                sub.selected = true;
                            }
                        }
                    },
                    get: function () {
                        return elem.selected ? 'showing' : 'disabled';
                    }
                });

                new_subs.push(elem);
            });

            if (new_subs.length) Lampa.PlayerPanel.setSubs(new_subs);
        }

        function setWebosTracks(video_tracks) {
            if (!inited_parse || !Array.isArray(inited_parse.streams) || !video_tracks) return;
            var parse_tracks = inited_parse.streams.filter(function (a) { return a.codec_type === 'audio'; });
            parse_tracks = alignStreamsWithPlayer(parse_tracks, video_tracks.length, ['truehd', 'dts', 'mlp']);

            parse_tracks.forEach(function (track, i) {
                if (video_tracks[i]) {
                    video_tracks[i].language = getTrackLang(track);
                    video_tracks[i].label = getTrackLabel(track, 'Audio', i);
                    video_tracks[i].ghost = false;
                }
            });
            Lampa.PlayerPanel.setTracks(video_tracks);
        }

        function setWebosSubs(video_subs) {
            if (!inited_parse || !Array.isArray(inited_parse.streams) || !video_subs) return;
            var parse_subs = inited_parse.streams.filter(function (a) { return a.codec_type === 'subtitle'; });
            var realSubsCount = Math.max(0, video_subs.length - 1);
            var offset = video_subs.length === parse_subs.length ? 0 : 1;

            parse_subs = alignStreamsWithPlayer(parse_subs, realSubsCount, ['hdmv_pgs_subtitle', 'dvd_subtitle']);

            parse_subs.forEach(function (track, a) {
                var i = a + offset;
                if (video_subs[i]) {
                    video_subs[i].language = getTrackLang(track);
                    video_subs[i].label = getTrackLabel(track, 'Subtitles', a);
                    video_subs[i].ghost = false;
                }
            });
            Lampa.PlayerPanel.setSubs(video_subs);
        }

        function scheduleTrackSync() {
            if (retryTimer || !inited || retryCount >= 10) return;
            retryTimer = setTimeout(function () {
                retryTimer = null;
                if (!inited) return;
                retryCount++;

                setTracks();
                setSubs();

                if (getSubs().length === 0 && getTracks().length === 0) {
                    scheduleTrackSync();
                }
            }, 600);
        }

        function onNativeTrackAdded() {
            if (!inited) return;
            setTracks();
            setSubs();
        }

        function bindNativeTrackListeners() {
            var video = Lampa.PlayerVideo.video();
            if (!video) return;
            try {
                if (video.textTracks && video.textTracks.addEventListener) {
                    video.textTracks.removeEventListener('addtrack', onNativeTrackAdded);
                    video.textTracks.addEventListener('addtrack', onNativeTrackAdded);
                }
                if (video.audioTracks && video.audioTracks.addEventListener) {
                    video.audioTracks.removeEventListener('addtrack', onNativeTrackAdded);
                    video.audioTracks.addEventListener('addtrack', onNativeTrackAdded);
                }
            } catch (e) {}
        }

        function unbindNativeTrackListeners() {
            var video = Lampa.PlayerVideo.video();
            if (!video) return;
            try {
                if (video.textTracks && video.textTracks.removeEventListener) {
                    video.textTracks.removeEventListener('addtrack', onNativeTrackAdded);
                }
                if (video.audioTracks && video.audioTracks.removeEventListener) {
                    video.audioTracks.removeEventListener('addtrack', onNativeTrackAdded);
                }
            } catch (e) {}
        }

        function listenTracks() { setTracks(); }
        function listenSubs() { setSubs(); }

        function canPlay() {
            bindNativeTrackListeners();
            setTracks();
            setSubs();
        }

        function listenWebosSubs(_data) {
            if (_data && _data.subs && _data.subs.length) {
                webos_replace.subs = _data.subs;
                if (inited_parse) setWebosSubs(_data.subs);
            }
        }

        function listenWebosTracks(_data) {
            if (_data && _data.tracks && _data.tracks.length) {
                webos_replace.tracks = _data.tracks;
                if (inited_parse) setWebosTracks(_data.tracks);
            }
        }

        function listenStart() {
            inited = true;
            retryCount = 0;
            bindNativeTrackListeners();

            // Сразу пробуем вытянуть нативные дорожки из плеера, пока ждем ответ сервера
            setTracks();
            setSubs();

            abortRequest = requestStreamMeta(data, function (result) {
                inited_parse = result;
                if (inited) {
                    if (webos_replace.subs) setWebosSubs(webos_replace.subs);
                    else setSubs();

                    if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
                    else setTracks();
                }
            });

            // Запускаем страхующий таймер на случай медленной инициализации контейнера (Dolby Vision)
            scheduleTrackSync();
        }

        function listenDestroy() {
            inited = false;
            if (retryTimer) {
                clearTimeout(retryTimer);
                retryTimer = null;
            }
            if (abortRequest) {
                abortRequest();
                abortRequest = null;
            }
            unbindNativeTrackListeners();
            Lampa.Player.listener.remove('destroy', listenDestroy);
            Lampa.PlayerVideo.listener.remove('tracks', listenTracks);
            Lampa.PlayerVideo.listener.remove('subs', listenSubs);
            Lampa.PlayerVideo.listener.remove('webos_subs', listenWebosSubs);
            Lampa.PlayerVideo.listener.remove('webos_tracks', listenWebosTracks);
            Lampa.PlayerVideo.listener.remove('canplay', canPlay);
        }

        Lampa.Player.listener.follow('destroy', listenDestroy);
        Lampa.PlayerVideo.listener.follow('tracks', listenTracks);
        Lampa.PlayerVideo.listener.follow('subs', listenSubs);
        Lampa.PlayerVideo.listener.follow('webos_subs', listenWebosSubs);
        Lampa.PlayerVideo.listener.follow('webos_tracks', listenWebosTracks);
        Lampa.PlayerVideo.listener.follow('canplay', canPlay);
        listenStart();
    }

    // Слушатель старта плеера в Lampa
    Lampa.Player.listener.follow('start', function (data) {
        if (data.torrent_hash || data.path) subscribeTracks(data);
    });

})();
