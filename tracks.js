(function () {
    'use strict';

    var connect_host = '{localhost}';
    var list_opened = false;

    function reguest(params, callback) {
        if (!params) return function () {};

        var ext = params.path ? params.path.split('.').pop().toLowerCase() : '';
        if (params.ffprobe && ext !== 'mp4') {
            var timer = setTimeout(function () {
                callback({ streams: params.ffprobe });
            }, 200);
            return function () { clearTimeout(timer); };
        }

        if (connect_host === '{localhost}') connect_host = '185.204.0.61';

        var socket;
        try {
            socket = new WebSocket('ws://' + connect_host + ':8080/?' + params.torrent_hash + '&index=' + params.id);
        } catch (e) {
            return function () {};
        }

        socket.addEventListener('message', function (event) {
            socket.close();
            var json = {};
            try {
                json = JSON.parse(event.data);
            } catch (e) {}

            if (json && Array.isArray(json.streams)) callback(json);
        });

        return function () {
            if (socket && (socket.readyState === 0 || socket.readyState === 1)) {
                socket.close();
            }
        };
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

        log('Tracks', 'start');

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
            if (!inited_parse || !Array.isArray(inited_parse.streams)) return;
            // Если на WebOS уже пришли нативные сабы через Luna API, не затираем их HTML5-заглушками
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

            // Если в ffprobe есть субтитры, но плеер (например, при инициализации Dolby Vision)
            // ещё не успел создать textTracks или прислать webos_subs — запускаем отложенную проверку
            if (parse_subs.length > 0 && video_subs.length === 0 && !webos_replace.subs) {
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

            parse_tracks.forEach(function (track, i) {
                if (video_tracks[i]) {
                    video_tracks[i].language = getTrackLang(track);
                    video_tracks[i].label = getTrackLabel(track, 'Audio', i);
                    video_tracks[i].ghost = false;
                }
            });

            // Принудительно обновляем список в панели, если ранее он был заполнен ghost-элементами
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

            parse_subs = alignStreamsWithPlayer(parse_subs, realSubsCount, ['hdmv_pgs_subtitle', 'dvd_subtitle']);

            parse_subs.forEach(function (track, a) {
                var i = a + offset;
                if (video_subs[i]) {
                    video_subs[i].language = getTrackLang(track);
                    video_subs[i].label = getTrackLabel(track, 'Subtitles', a);
                    video_subs[i].ghost = false;
                }
            });

            // Принудительно передаем живые WebOS-субтитры в панель (снимает серый ghost-статус)
            Lampa.PlayerPanel.setSubs(video_subs);
        }

        // Поллинг на случай медленной инициализации контейнера Dolby Vision (до 15 попыток по 600 мс)
        function scheduleTrackSync() {
            if (retryTimer || !inited || retryCount >= 15) return;
            retryTimer = setTimeout(function () {
                retryTimer = null;
                if (!inited) return;
                retryCount++;

                var hasSubsNow = getSubs().length > 0 || Boolean(webos_replace.subs);
                var hasTracksNow = getTracks().length > 0 || Boolean(webos_replace.tracks);

                log('Tracks', 'DV/WebOS retry sync #' + retryCount, 'subsReady:', hasSubsNow);

                if (hasTracksNow) {
                    if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
                    else setTracks();
                }

                if (hasSubsNow) {
                    if (webos_replace.subs) setWebosSubs(webos_replace.subs);
                    else setSubs();
                } else {
                    scheduleTrackSync();
                }
            }, 600);
        }

        function onNativeTrackAdded() {
            if (!inited) return;
            log('Tracks', 'native addtrack event triggered');
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

        // НЕ удаляем слушатели tracks/subs/canplay после первого вызова,
        // так как на WebOS при старте Dolby Vision они могут приходить повторно после инициализации декодера
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
            if (_data && _data.subs && _data.subs.length) {
                webos_replace.subs = _data.subs;
                if (inited_parse) setWebosSubs(_data.subs);
            }
        }

        function listenWebosTracks(_data) {
            log('Tracks', 'webos tracks event');
            if (_data && _data.tracks && _data.tracks.length) {
                webos_replace.tracks = _data.tracks;
                if (inited_parse) setWebosTracks(_data.tracks);
            }
        }

        function listenStart() {
            inited = true;
            retryCount = 0;
            bindNativeTrackListeners();

            abortRequest = reguest(data, function (result) {
                log('Tracks', 'parsed', result);
                inited_parse = result;

                if (inited) {
                    if (webos_replace.subs) setWebosSubs(webos_replace.subs);
                    else setSubs();

                    if (webos_replace.tracks) setWebosTracks(webos_replace.tracks);
                    else setTracks();
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

                if (v.duration) {
                    line.duration = new Date(v.duration * 1000).toISOString().slice(11, 19);
                } else if (v.tags) {
                    var rawDur = v.tags.DURATION || v.tags['DURATION-eng'] || '';
                    if (rawDur) {
                        line.duration = String(rawDur).split('.')[0];
                    }
                }

                if (v.codec_name) line.codec = v.codec_name.toUpperCase();
                if (Boolean(v.is_avc)) line.avc = 'AVC';
                var bit = v.bit_rate ? v.bit_rate : (v.tags && (v.tags.BPS || v.tags['BPS-eng'])) ? (v.tags.BPS || v.tags['BPS-eng']) : '--';
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
                }
                var bit = a.bit_rate ? a.bit_rate : (a.tags && (a.tags.BPS || a.tags['BPS-eng'])) ? (a.tags.BPS || v.tags['BPS-eng']) : '--';
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
        if (data.torrent_hash) subscribeTracks(data);
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
