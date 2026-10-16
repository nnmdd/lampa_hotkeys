(function () {
    'use strict';

    if (window.lampa_tracks_local_loaded) return;
    window.lampa_tracks_local_loaded = true;

    var list_opened = false;
    var ffprobe_cache = {};

    // Получаем базовый URL локального TorrServer из настроек Lampa
    function getTorrServerUrl() {
        if (Lampa.Torserver && typeof Lampa.Torserver.ip === 'function') {
            var ip = Lampa.Torserver.ip();
            if (ip) return ip.replace(/\/+$/, '');
        }
        var url = Lampa.Storage.get('torrserver_url', '') || Lampa.Storage.field('torrserver_url') || '';
        if (url) {
            if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
            return url.replace(/\/+$/, '');
        }
        return '';
    }

    // Формируем заголовки авторизации, если в Lampa включен вход в TorrServer по паролю
    function getTorrServerHeaders() {
        var headers = {};
        if (Lampa.Storage.field('torrserver_auth')) {
            var login = Lampa.Storage.get('torrserver_login', '');
            var pass = Lampa.Storage.field('torrserver_password') || Lampa.Storage.get('torrserver_password', '');
            if (login && pass && window.btoa) {
                headers['Authorization'] = 'Basic ' + window.btoa(login + ':' + pass);
            }
        }
        return headers;
    }

    // Извлекаем hash и id файла из объекта params или из URL потока TorrServer
    function resolveTorrentParams(params) {
        var hash = params.torrent_hash || params.hash || '';
        var id = params.id !== undefined ? params.id : (params.index !== undefined ? params.index : '');
        var streamUrl = params.url || params.path || '';

        // Если запуск идет из истории/продолжения просмотра и hash/id не переданы напрямую, парсим из URL
        if ((!hash || id === '') && streamUrl) {
            var matchQuery = streamUrl.match(/[?&]link=([a-fA-F0-9]{40}).*?[?&]index=(\d+)/i);
            if (matchQuery) {
                hash = hash || matchQuery[1];
                if (id === '') id = matchQuery[2];
            } else {
                var matchPath = streamUrl.match(/\/stream\/[^?]*\?link=([a-fA-F0-9]{40})&index=(\d+)/i);
                if (matchPath) {
                    hash = hash || matchPath[1];
                    if (id === '') id = matchPath[2];
                }
            }
        }

        // Определяем хост TorrServer (из настроек Lampa или напрямую из URL потока)
        var baseUrl = getTorrServerUrl();
        if (!baseUrl && streamUrl && /^https?:\/\//i.test(streamUrl)) {
            var mHost = streamUrl.match(/^(https?:\/\/[^\/]+)/i);
            if (mHost) baseUrl = mHost[1];
        }

        return {
            hash: hash,
            id: id !== '' ? id : 1,
            baseUrl: baseUrl
        };
    }

    // Запрос к встроенному в TorrServer ffprobe: GET /ffp/{hash}/{id}
    function reguest(params, callback) {
        if (!params) return function () {};

        // 1. Если ffprobe уже передан самим компонентом Lampa
        if (params.ffprobe && Array.isArray(params.ffprobe) && params.ffprobe.length) {
            var timer = setTimeout(function () {
                callback({ streams: params.ffprobe });
            }, 50);
            return function () { clearTimeout(timer); };
        }

        var info = resolveTorrentParams(params);
        if (!info.hash || !info.baseUrl) {
            return function () {};
        }

        var cacheKey = info.hash + '_' + info.id;
        if (ffprobe_cache[cacheKey]) {
            var cachedTimer = setTimeout(function () {
                callback(ffprobe_cache[cacheKey]);
            }, 50);
            return function () { clearTimeout(cachedTimer); };
        }

        var ffpUrl = info.baseUrl + '/ffp/' + info.hash + '/' + info.id;

        var xhr = $.ajax({
            url: ffpUrl,
            type: 'GET',
            dataType: 'json',
            headers: getTorrServerHeaders(),
            timeout: 15000,
            success: function (json) {
                if (json && Array.isArray(json.streams)) {
                    ffprobe_cache[cacheKey] = json;
                    callback(json);
                }
            },
            error: function (err) {
                console.log('Tracks', 'TorrServer /ffp/ error:', err && err.status);
            }
        });

        return function () {
            if (xhr && xhr.abort) xhr.abort();
        };
    }

    function getTrackLabel(track, fallbackPrefix, index) {
        var tags = track.tags || {};
        var title = tags.title || tags.TITLE || tags.handler_name || '';
        if (/^(Sound|Video|Subtitle|Media|GPAC|ISO|Core Media).*Handler$/i.test(title)) {
            title = '';
        }
        if (!title) {
            var codec = track.codec_name ? track.codec_name.toUpperCase() : '';
            title = fallbackPrefix + ' ' + (index + 1) + (codec ? ' (' + codec + ')' : '');
        }
        return title;
    }

    function getTrackLang(track) {
        var tags = track.tags || {};
        return tags.language || tags.LANGUAGE || '';
    }

    function isBitmapSubtitle(codecName) {
        var c = (codecName || '').toLowerCase();
        return c === 'hdmv_pgs_subtitle' || c === 'dvd_subtitle' || c === 'dvb_subtitle' || c === 'xsub';
    }

    function alignStreamsWithPlayer(streams, playerLength, unsupportedCodecs) {
        var result = streams.slice();
        if (playerLength > 0 && result.length > playerLength) {
            for (var c = 0; c < unsupportedCodecs.length; c++) {
                var badCodec = unsupportedCodecs[c];
                if (result.length > playerLength) {
                    result = result.filter(function (a) {
                        return (a.codec_name || '').toLowerCase() !== badCodec;
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

        log('Tracks', 'start (TorrServer local ffprobe)');

        function setTracks() {
            if (!inited_parse || !Array.isArray(inited_parse.streams)) return;
            if (webos_replace.tracks) {
                setWebosTracks(webos_replace.tracks);
                return;
            }

            var new_tracks = [];
            var video_tracks = getTracks();
            var parse_tracks = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });

            log('Tracks', 'set tracks:', video_tracks.length, 'ffprobe:', parse_tracks.length);

            parse_tracks = alignStreamsWithPlayer(parse_tracks, video_tracks.length, ['truehd', 'dts', 'mlp']);

            parse_tracks.forEach(function (track, idx) {
                var orig = video_tracks[idx];
                var isSelected = orig ? (orig.selected === true || orig.enabled === true) : (idx === 0);
                var codec = (track.codec_name || '').toLowerCase();
                var isUnsupportedAudio = !orig && (codec === 'truehd' || codec === 'mlp');

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Audio', idx),
                    // Не делаем дорожку серой, если плеер просто еще не успел прогрузить audioTracks
                    ghost: video_tracks.length > 0 ? !orig : isUnsupportedAudio,
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

            if (parse_tracks.length > 0 && video_tracks.length < parse_tracks.length) {
                scheduleTrackSync();
            }
        }

        function setSubs() {
            if (!inited_parse || !Array.isArray(inited_parse.streams)) return;
            if (webos_replace.subs) {
                setWebosSubs(webos_replace.subs);
                return;
            }

            var new_subs = [];
            var video_subs = getSubs();
            var parse_subs = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            log('Tracks', 'set subs:', video_subs.length, 'ffprobe:', parse_subs.length);

            parse_subs = alignStreamsWithPlayer(parse_subs, video_subs.length, ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvb_subtitle']);

            parse_subs.forEach(function (track, idx) {
                var orig = video_subs[idx];
                var isSelected = orig ? (orig.selected === true || orig.mode === 'showing') : false;

                // ФИКС СЕРЫХ СУБТИТРОВ:
                // Помечаем ghost: true ТОЛЬКО если это графические PGS/DVD сабы, которых нет в video.textTracks.
                // Обычные текстовые субтитры (SRT/ASS/MOV_TEXT) всегда оставляем активными (ghost: false),
                // даже если декодер Dolby Vision задержал инициализацию video.textTracks!
                var isGhost = !orig && isBitmapSubtitle(track.codec_name);

                var elem = {
                    index: idx,
                    language: getTrackLang(track),
                    label: getTrackLabel(track, 'Subtitles', idx),
                    ghost: isGhost,
                    selected: isSelected
                };

                Object.defineProperty(elem, 'mode', {
                    set: function (v) {
                        elem.selected = Boolean(v && v !== 'disabled');
                        if (v) {
                            // Если к моменту клика пользователя подоспели нативные webos_subs, переключаем и их
                            if (webos_replace.subs) {
                                var wOffset = webos_replace.subs.length === parse_subs.length ? 0 : 1;
                                var wSub = webos_replace.subs[elem.index + wOffset];
                                if (wSub) wSub.mode = v;
                            }

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

            // Продолжаем фоновую синхронизацию, пока число дорожек в плеере меньше ожидаемого
            if (parse_subs.length > 0 && video_subs.length < parse_subs.length) {
                scheduleTrackSync();
            }
        }

        function setWebosTracks(video_tracks) {
            if (!inited_parse || !Array.isArray(inited_parse.streams) || !video_tracks) return;

            var parse_tracks = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });

            log('Tracks', 'webos set tracks:', video_tracks.length, 'ffprobe:', parse_tracks.length);

            parse_tracks = alignStreamsWithPlayer(parse_tracks, video_tracks.length, ['truehd', 'dts', 'mlp']);

            for (var k = 0; k < video_tracks.length; k++) {
                video_tracks[k].ghost = false;
            }

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

            var parse_subs = inited_parse.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            var realSubsCount = Math.max(0, video_subs.length - 1);
            var offset = video_subs.length === parse_subs.length ? 0 : 1;

            log('Tracks', 'webos set subs:', video_subs.length, 'ffprobe:', parse_subs.length);

            parse_subs = alignStreamsWithPlayer(parse_subs, realSubsCount, ['hdmv_pgs_subtitle', 'dvd_subtitle', 'dvb_subtitle']);

            // Снимаем ghost со всех элементов массива WebOS (включая пункт "Отключить")
            for (var k = 0; k < video_subs.length; k++) {
                video_subs[k].ghost = false;
            }

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

        // Поллинг до 25 раз по 700 мс (~17.5 секунд), пока все дорожки контейнера не инициализируются
        function scheduleTrackSync() {
            if (retryTimer || !inited || retryCount >= 25) return;
            retryTimer = setTimeout(function () {
                retryTimer = null;
                if (!inited || !inited_parse || !Array.isArray(inited_parse.streams)) return;
                retryCount++;

                var expectedSubs = inited_parse.streams.filter(function (a) {
                    return a.codec_type === 'subtitle' && !isBitmapSubtitle(a.codec_name);
                }).length;
                var expectedTracks = inited_parse.streams.filter(function (a) {
                    return a.codec_type === 'audio';
                }).length;

                var currentSubsCount = webos_replace.subs ? Math.max(0, webos_replace.subs.length - 1) : getSubs().length;
                var currentTracksCount = webos_replace.tracks ? webos_replace.tracks.length : getTracks().length;

                log('Tracks', 'Sync #' + retryCount, 'subs:', currentSubsCount + '/' + expectedSubs, 'tracks:', currentTracksCount + '/' + expectedTracks);

                if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
                else setTracks();

                if (webos_replace.subs) setWebosSubs(webos_replace.subs);
                else setSubs();

                if (currentSubsCount < expectedSubs || currentTracksCount < expectedTracks) {
                    scheduleTrackSync();
                }
            }, 700);
        }

        function onNativeTrackAdded() {
            if (!inited) return;
            if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
            else setTracks();

            if (webos_replace.subs) setWebosSubs(webos_replace.subs);
            else setSubs();
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

        function listenTracks() {
            log('Tracks', 'tracks video event');
            setTracks();
        }

        function listenSubs() {
            log('Tracks', 'subs video event');
            setSubs();
        }

        function canPlay() {
            log('Tracks', 'canplay video event');
            bindNativeTrackListeners();
            if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
            else setTracks();

            if (webos_replace.subs) setWebosSubs(webos_replace.subs);
            else setSubs();
        }

        function listenWebosSubs(_data) {
            log('Tracks', 'webos subs event');
            // На WebOS массив _data.subs часто сначала приходит с 1 элементом ("Отключить"),
            // а реальные субтитры добавляются позже. Сохраняем ссылку, только когда в массиве есть реальные сабы (> 1)
            if (_data && Array.isArray(_data.subs) && _data.subs.length > 0) {
                webos_replace.subs = _data.subs;
                if (inited_parse) setWebosSubs(_data.subs);
                if (_data.subs.length <= 1) {
                    scheduleTrackSync();
                }
            }
        }

        function listenWebosTracks(_data) {
            log('Tracks', 'webos tracks event');
            if (_data && Array.isArray(_data.tracks) && _data.tracks.length > 0) {
                webos_replace.tracks = _data.tracks;
                if (inited_parse) setWebosTracks(_data.tracks);
            }
        }

        function listenStart() {
            inited = true;
            retryCount = 0;
            bindNativeTrackListeners();

            abortRequest = reguest(data, function (result) {
                log('Tracks', 'parsed from TorrServer /ffp/', result);
                inited_parse = result;

                if (inited) {
                    if (webos_replace.subs && webos_replace.subs.length > 1) {
                        setWebosSubs(webos_replace.subs);
                    } else {
                        setSubs();
                    }

                    if (webos_replace.tracks && webos_replace.tracks.length > 0) {
                        setWebosTracks(webos_replace.tracks);
                    } else {
                        setTracks();
                    }
                }
            });
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
            log('Tracks', 'end');
        }

        Lampa.Player.listener.follow('destroy', listenDestroy);
        Lampa.PlayerVideo.listener.follow('tracks', listenTracks);
        Lampa.PlayerVideo.listener.follow('subs', listenSubs);
        Lampa.PlayerVideo.listener.follow('webos_subs', listenWebosSubs);
        Lampa.PlayerVideo.listener.follow('webos_tracks', listenWebosTracks);
        Lampa.PlayerVideo.listener.follow('canplay', canPlay);
        listenStart();
    }

    function parseMetainfo(data) {
        var loading = Lampa.Template.get('tracks_loading');
        data.item.after(loading);

        reguest(data.element, function (result) {
            if (!list_opened || !result || !Array.isArray(result.streams)) {
                loading.remove();
                return;
            }

            var html = Lampa.Template.get('tracks_metainfo', {});

            var append = function (name, fields) {
                if (fields.length) {
                    var block = Lampa.Template.get('tracks_metainfo_block', {});
                    block.find('.tracks-metainfo__label').text(
                        Lampa.Lang.translate(
                            name === 'video' ? 'extensions_hpu_video' :
                            name === 'audio' ? 'player_tracks' : 'player_' + name
                        )
                    );
                    fields.forEach(function (fieldData) {
                        var item = $('<div class="tracks-metainfo__item tracks-metainfo__item--' + name + ' selector"></div>');
                        item.on('hover:focus', function () {
                            Lampa.Modal.scroll().update(item);
                        });

                        for (var key in fieldData) {
                            if (Object.prototype.hasOwnProperty.call(fieldData, key)) {
                                var div = $('<div class="tracks-metainfo__column--' + key + '"></div>');
                                div.text(fieldData[key]);
                                item.append(div);
                            }
                        }

                        block.find('.tracks-metainfo__info').append(item);
                    });
                    html.append(block);
                }
            };

            var video = [];
            var audio = [];
            var subs = [];

            var codec_video = result.streams.filter(function (a) {
                return a.codec_type === 'video' && a.codec_name !== 'mjpeg' && a.codec_name !== 'png';
            });
            var codec_audio = result.streams.filter(function (a) {
                return a.codec_type === 'audio';
            });
            var codec_subs = result.streams.filter(function (a) {
                return a.codec_type === 'subtitle';
            });

            codec_video.slice(0, 1).forEach(function (v) {
                var line = {};
                if (v.width && v.height) line.video = v.width + 'х' + v.height;

                var durSec = v.duration || (result.format && result.format.duration);
                if (durSec && !isNaN(durSec)) {
                    line.duration = new Date(Number(durSec) * 1000).toISOString().slice(11, 19);
                } else if (v.tags) {
                    var rawDur = v.tags.DURATION || v.tags['DURATION-eng'] || '';
                    if (rawDur) {
                        line.duration = String(rawDur).split('.')[0];
                    }
                }

                if (v.codec_name) line.codec = v.codec_name.toUpperCase();
                if (Boolean(v.is_avc)) line.avc = 'AVC';
                var bit = v.bit_rate ? v.bit_rate : (v.tags && (v.tags.BPS || v.tags['BPS-eng'])) ? (v.tags.BPS || v.tags['BPS-eng']) : (result.format && result.format.bit_rate ? result.format.bit_rate : '--');
                line.rate = bit === '--' ? bit : Math.round(bit / 1000000) + ' ' + Lampa.Lang.translate('speed_mb');
                if (Lampa.Arrays.getKeys(line).length) video.push(line);
            });

            codec_audio.forEach(function (a, i) {
                var line = { num: i + 1 };
                line.lang = getTrackLang(a).toUpperCase();
                line.name = getTrackLabel(a, 'Audio', i);
                if (a.codec_name) line.codec = a.codec_name.toUpperCase();
                if (a.channel_layout) {
                    line.channels = a.channel_layout
                        .replace('(side)', '')
                        .replace('stereo', '2.0')
                        .replace('8 channels (FL+FR+FC+LFE+SL+SR+TFL+TFR)', '7.1');
                } else if (a.channels) {
                    line.channels = a.channels === 6 ? '5.1' : (a.channels === 8 ? '7.1' : (a.channels === 2 ? '2.0' : a.channels + ' ch'));
                }
                var bit = a.bit_rate ? a.bit_rate : (a.tags && (a.tags.BPS || a.tags['BPS-eng'])) ? (a.tags.BPS || a.tags['BPS-eng']) : '--';
                line.rate = bit === '--' ? bit : Math.round(bit / 1000) + ' ' + Lampa.Lang.translate('speed_kb');
                if (Lampa.Arrays.getKeys(line).length) audio.push(line);
            });

            codec_subs.forEach(function (a, i) {
                var line = { num: i + 1 };
                line.lang = getTrackLang(a).toUpperCase();
                line.name = getTrackLabel(a, 'Subtitles', i);
                if (a.codec_name) {
                    line.codec = a.codec_name.toUpperCase()
                        .replace('SUBRIP', 'SRT')
                        .replace('HDMV_PGS_SUBTITLE', 'HDMV PGS')
                        .replace('MOV_TEXT', 'MOV TEXT');
                }
                if (Lampa.Arrays.getKeys(line).length) subs.push(line);
            });

            append('video', video);
            append('audio', audio);
            append('subs', subs);
            loading.remove();

            if (video.length || audio.length || subs.length) {
                data.item.after(html);
            }

            if (Lampa.Controller.enabled().name === 'modal') Lampa.Controller.toggle('modal');
        });
    }

    Lampa.Player.listener.follow('start', function (data) {
        if (data && (data.torrent_hash || (data.url && data.url.indexOf('/stream/') !== -1))) {
            subscribeTracks(data);
        }
    });

    Lampa.Listener.follow('torrent_file', function (data) {
        if (data.type === 'list_open') list_opened = true;
        if (data.type === 'list_close') list_opened = false;

        if (data.type === 'render' && data.items.length === 1 && list_opened) {
            parseMetainfo(data);
        }
    });

    Lampa.Template.add('tracks_loading', "\n    <div class=\"tracks-loading\">\n        <span>#{loading}...</span>\n    </div>\n");
    Lampa.Template.add('tracks_metainfo', "\n    <div class=\"tracks-metainfo\"></div>\n");
    Lampa.Template.add('tracks_metainfo_block', "\n    <div class=\"tracks-metainfo__line\">\n        <div class=\"tracks-metainfo__label\"></div>\n        <div class=\"tracks-metainfo__info\"></div>\n    </div>\n");
    Lampa.Template.add('tracks_css', "\n    <style>\n    .tracks-loading{margin-top:1em;display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-box-align:start;-webkit-align-items:flex-start;-moz-box-align:start;-ms-flex-align:start;align-items:flex-start}.tracks-loading:before{content:'';display:inline-block;width:1.3em;height:1.3em;background:url('./img/loader.svg') no-repeat 50% 50%;-webkit-background-size:contain;-moz-background-size:contain;-o-background-size:contain;background-size:contain;margin-right:.4em}.tracks-loading>span{font-size:1.1em;line-height:1.1}.tracks-metainfo{margin-top:1em}.tracks-metainfo__line+.tracks-metainfo__line{margin-top:2em}.tracks-metainfo__label{opacity:.5;font-weight:600}.tracks-metainfo__info{padding-top:1em;line-height:1.2}.tracks-metainfo__info>div{background-color:rgba(0,0,0,0.22);display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-border-radius:.3em;-moz-border-radius:.3em;border-radius:.3em;-webkit-flex-wrap:wrap;-ms-flex-wrap:wrap;flex-wrap:wrap}.tracks-metainfo__info>div.focus{background-color:rgba(255,255,255,0.06)}.tracks-metainfo__info>div>div{padding:1em;-webkit-flex-shrink:0;-ms-flex-negative:0;flex-shrink:0}.tracks-metainfo__info>div>div:not(:last-child){padding-right:1.5em}.tracks-metainfo__info>div+div{margin-top:1em}.tracks-metainfo__column--video,.tracks-metainfo__column--name{margin-right:auto}.tracks-metainfo__column--num{min-width:3em;padding-right:0}.tracks-metainfo__column--rate{min-width:7em;text-align:right}.tracks-metainfo__column--channels{min-width:5em;text-align:right}\n    </style>\n");
    $('body').append(Lampa.Template.get('tracks_css', {}, true));

})();
