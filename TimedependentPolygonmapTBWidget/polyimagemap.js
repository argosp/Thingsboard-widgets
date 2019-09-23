self.onInit = function () {
    var elemap = $('#TimeseriesPolygonImageMap');
    self.ctx.map = new TbMapWidgetV2('image-map', false, self.ctx, undefined, elemap);
    self.posFunc = self.ctx.map.map.posFunction;
    setTimeout(() => {
        self.mapleaflet = self.ctx.map.map.map;
        window.TimeseriesPolygonImageMapSelf = self;
        self.onResize();

        console.log(self);
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

self.posOnMap = function(v) {
    const bounds = self.ctx.map.map.imageOverlay._bounds;
    var ne = bounds._northEast,
        sw = bounds._southWest;
    var pos = self.posFunc(v[0], v[1]);
    pos.y = lerp(ne.lat, sw.lat, pos.y);
    pos.x = lerp(sw.lng, ne.lng, pos.x);
    return [pos.x, pos.y];
};

self.posFuncGeoJson = function (geojson) {
    geojson.forEach((g) => {
        g.geometry.coordinates = g.geometry.coordinates.map(shape => shape.map(self.posOnMap));
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

self.getCurrIndex = function () {
    return parseInt($('#TimeFrame')[0].value);
};

self.setCurrIndex = function (val) {
    $('#TimeFrame')[0].value = val;
    self.onDataUpdated();
};

self.getPolygonFrames = function() {
    const jsons = self.ctx.data.filter(prop => prop.data.length > 0 && typeof prop.data[0][1] === "string");
    var maxRange = 0;
    const polygonFrames = jsons.map(prop => {
        const frames = parseJson(prop.data[0][1]);
        maxRange = Math.max(Math.max.apply(this, frames.map(b => b.index)));
        return {frames: frames, color: prop.dataKey.color};
    });
    return [polygonFrames, maxRange];
};

self.showPolygonFrame = function(polygonFrames, index) {
    let valueName = '';
    self.clearPolygons();
    polygonFrames.forEach(polys => {
        const poly = polys.frames.find(frame => parseInt(frame.index) === index);
        if (poly) {
            valueName = poly.name;
            self.showPolygons(poly.value, polys.color);
        }
    });
    self.ctx.map.update();
    return valueName ? valueName : '';
};

self.getDirectionTelemetry = function() {
    // console.log(self.ctx.data);
    const nonJsons = self.ctx.data.filter(prop => prop.data.length > 0 && typeof prop.data[0][1] !== "string");
    let ret = {};
    nonJsons.forEach(prop => {
        const t = prop.datasource.name;
        ret[t] = ret[t] || {};
        const kind = prop.dataKey.name;
        ret[t][kind] = prop.data[0][1];
    });
    return Object.values(ret);
};

self.showDirectionMarker = function(s) {
    if (!s.latitude || !s.longitude) return undefined;
    const dir = s[self.ctx.settings.keyNameDir];
    if (dir === undefined) return undefined;
    let power = s[self.ctx.settings.keyNamePower];
    if (power === undefined) power = 4;
    const powerSize = parseFloat(power) * self.ctx.settings.ArrowSizeAt4 / 4;

    const pos = self.posOnMap([s.latitude, s.longitude]);
    var marker = L.marker([pos[1], pos[0]], {
        icon: L.icon({
            iconUrl: self.ctx.settings.arrowImageUrl,
            iconSize: [powerSize, powerSize],
        })
    }).addTo(self.mapleaflet);

    var prevTrans = marker._icon.style.WebkitTransform.replace(/ rotate\(\d+deg\)/g, '');
    marker._icon.style.WebkitTransform = prevTrans + ' rotate(' + dir + 'deg)';
    marker._icon.style.WebkitTransformOrigin = 'center';

    return marker;
};

self.onDataUpdated = function () {
    try {
        const index = self.getCurrIndex();
        [polygonFrames, maxRange] = self.getPolygonFrames();
        $('#TimeFrame')[0].max = maxRange;
        $('#TimeFrameLabel')[0].value = self.showPolygonFrame(polygonFrames, index);
    } catch (err) {
        // console.log("JSON error:", self.ctx.data, err);
        // return;
    }

    (self.windMarkers || []).forEach(m => m.removeFrom(self.mapleaflet));
    const dirs = self.getDirectionTelemetry();
    self.windMarkers = dirs.map(self.showDirectionMarker);
    self.windMarkers = self.windMarkers.filter(a => a);
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
        var cont = () => {
            self.setNext();
            if (self.playing) {
                setTimeout(cont, self.ctx.settings.playDelay);
            }
        };
        cont();
    }
};

self.onResize = function () {
    self.ctx.map.resize();
    self.resizeMap();
};

self.getSettingsSchema = function () {
    var tbScheme = JSON.parse(JSON.stringify(TbMapWidgetV2.settingsSchema('image-map')));
    // console.log(tbScheme);
    tbScheme.form.unshift(
            "playDelay",
            "keyNameDir",
            "keyNamePower",
            "ArrowSizeAt4",
            {
                "key": "arrowImageUrl",
                "type": "image"
            }
        );
    Object.assign(tbScheme.schema.properties,
        {
            "playDelay": {
                "title": "Play delay",
                "type": "number",
                "default": 500
            },
            "keyNameDir": {
                "title": "Direction key name",
                "type": "string",
                "default": "wind_dir"
            },
            "keyNamePower": {
                "title": "Power key name",
                "type": "string",
                "default": "wind_speed"
            },
            "ArrowSizeAt4": {
                "title": "Arrow size in pixels when power/speed is 4",
                "type": "number",
                "default": 40
            },
            "arrowImageUrl": {
                "title": "Arrow image",
                "type": "string",
                "default": "data:image/png;base64,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"
            }
        });
    return tbScheme;
};
self.getDataKeySettingsSchema = function () {
    return TbMapWidgetV2.dataKeySettingsSchema('image-map');
};

self.actionSources = function () {
    return TbMapWidgetV2.actionSources();
};

self.onDestroy = function () { };
