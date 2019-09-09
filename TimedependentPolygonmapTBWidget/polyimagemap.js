self.onInit = function () {
    var map = $('#TimeseriesPolygonImageMap');
    self.ctx.map = new TbMapWidgetV2('image-map', false, self.ctx, undefined, map);
    self.posFunc = self.ctx.map.map.posFunction;
    setTimeout(() => {
        self.mapleaflet = self.ctx.map.map.map;
        window.TimeseriesPolygonImageMapSelf = self;
        self.onResize();
    }, 10);
};

self.resizeMap = function () {
    if (!self.mapleaflet || !self.mapleaflet._container){
        return;
    }
    self.mapleaflet._container.style.height = (self.ctx.height - 30) + "px";
    self.mapleaflet.invalidateSize();
};

self.clearPolygons = function () {
    if (!self.mapleaflet || !self.mapleaflet._layers){
        return;
    }
    for (var i in self.mapleaflet._layers) {
        if (self.mapleaflet._layers[i]._path !== undefined) {
            try {
                self.mapleaflet.removeLayer(self.mapleaflet._layers[i]);
            } catch (e) {
                console.log("problem with " + e + self.mapleaflet._layers[i]);
            }
        }
    }
};

function parseJson(json) {
    var value = String(json).replace(/'/g, '\"');
    return JSON.parse(value);
}

function lerp(a, b, f) {
    return a + f * (b - a);
}

self.posFuncGeoJson = function (geojson) {
    self.bounds = self.ctx.map.map.imageOverlay._bounds;
    var ne = self.bounds._northEast,
        sw = self.bounds._southWest;
    geojson.forEach((g) => {
        g.geometry.coordinates = g.geometry.coordinates
            .map(shape => {
                return shape.map(v => {
                    var pos = self.posFunc(v[0], v[1]);
                    pos.y = lerp(ne.lat, sw.lat, pos.y);
                    pos.x = lerp(sw.lng, ne.lng, pos.x);
                    return [pos.x, pos.y];
                });
            });
    });
    return geojson;
};

self.showPolygons = function (parsed, color) {
    try {
        var geojsonFeature = self.posFuncGeoJson(parsed.features);
        L.geoJSON(geojsonFeature, {
            style: { "color": color, "opacity": 0.8 }
        }).addTo(self.mapleaflet);
    } catch (e) {
        console.log(e);
    }
};

self.updateTimeRange = function (parsed) {
    var maxRange = 0;
    for (i = 0; i < parsed.length; i++) {
        for (j = 0; j < parsed[i].length; j++) {
            if (parsed[i][j].index > maxRange) {
                maxRange = parsed[i][j].index;
            }
        }
    }
    $('#TimeFrame')[0].max = maxRange;
};

function findCurrFrame(frames, index) {
    if (frames instanceof Array) {
        for (var i = 0; i < frames.length; ++i) {
            if (parseInt(frames[i].index) === index) {
                return frames[i];
            }
        }
    }
    return undefined;
}

self.getCurrIndex = function () {
    return parseInt($('#TimeFrame')[0].value);
};

self.setCurrIndex = function (val) {
    $('#TimeFrame')[0].value = val;
    self.onDataUpdated();
};

self.onDataUpdated = function () {
    var parsed;
    try {
        parsed = self.ctx.data.map(prop => parseJson(prop.data[0][1]));
    } catch (err) {
        // console.log("JSON error:", self.ctx.data, err);
        return;
    }
    self.updateTimeRange(parsed);
    var index = self.getCurrIndex();
    self.clearPolygons();
    // console.log(self.ctx.data);
    var valueName;
    for (i = 0; i < self.ctx.data.length; i++) {
        var poly = findCurrFrame(parsed[i], index);
        if (!poly) continue;
        valueName = poly.name;
        var color = self.ctx.data[i].dataKey.color;
        self.showPolygons(poly.value, color);
    }
    $('#TimeFrameLabel')[0].value = valueName ? valueName : '';
    self.ctx.map.update();
};

self.setNext = function () {
    var maxRange = parseInt($('#TimeFrame')[0].max);
    if (maxRange >= 1) {
        self.setCurrIndex((self.getCurrIndex() + 1) % (maxRange + 1));
    } else {
        self.setCurrIndex(0);
    }
};

self.Play = function () {
    self.playing = !self.playing;
    $('#PlayButton').text(self.playing ? 'Stop' : 'Play');
    if (self.playing) {
        var delay = self.ctx.settings.playDelay || 500;
        var cont = (function() {
            self.setNext();
            if (self.playing) {
                setTimeout(cont, delay);
            }
        }).bind(this);
        cont();
    }
};

self.onResize = function () {
    self.ctx.map.resize();
    self.resizeMap();
};

self.getSettingsSchema = function () {
    var tbScheme = TbMapWidgetV2.settingsSchema('image-map');
    return tbScheme;
};
self.getDataKeySettingsSchema = function () {
    return TbMapWidgetV2.dataKeySettingsSchema('image-map');
};

self.actionSources = function () {
    return TbMapWidgetV2.actionSources();
};

self.onDestroy = function () { };