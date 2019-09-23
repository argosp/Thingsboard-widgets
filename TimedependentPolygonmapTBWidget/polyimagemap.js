self.onInit = function () {
    var map = $('#TimeseriesPolygonImageMap');
    self.ctx.map = new TbMapWidgetV2('image-map', false, self.ctx, undefined, map);
    self.posFunc = self.ctx.map.map.posFunction;
    setTimeout(() => {
        self.mapleaflet = self.ctx.map.map.map;
        window.TimeseriesPolygonImageMapSelf = self;
        self.onResize();

        // var markimg = self.markerImage;
        // var markerImages = self.ctx.widgetConfig.settings.markerImages;
        // if (self.ctx.widgetConfig.settings.markerImages.length >= 4) {
        //     markimg = self.ctx.widgetConfig.settings.markerImages[4];
        // }
        self.arrowIcon = L.icon({
            iconUrl: self.markerImage,
            iconSize: [20, 20],
            // iconAnchor: [5, 5]
        });
        // }
        console.log(self);
    }, 10);
};

function rotateMarker(marker, angle) {
    var prevTrans = marker._icon.style.WebkitTransform.replace(/ rotate\(\d+deg\)/g, '');
    marker._icon.style.WebkitTransform = prevTrans + ' rotate(' + angle + 'deg)';
    return marker;
}

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

self.getWindSensors = function() {
    // console.log(self.ctx.data);
    const nonJsons = self.ctx.data.filter(prop => prop.data.length > 0 && typeof prop.data[0][1] !== "string");
    let sensors = {};
    nonJsons.forEach(prop => {
        const t = prop.datasource.name;
        sensors[t] = sensors[t] || {};
        const kind = prop.dataKey.name;
        sensors[t][kind] = prop.data[0][1];
    });
    return Object.values(sensors);
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
    self.windMarkers = [];
    self.getWindSensors().forEach(s => {
        if (!s.latitude || !s.longitude) return;
        const pos = self.posOnMap([s.latitude, s.longitude]);
        var marker = L.marker([pos[1], pos[0]], {
            icon: self.arrowIcon
        }).addTo(self.mapleaflet);
        marker._icon.style.WebkitTransformOrigin = 'center';
        self.windMarkers.push(marker);
        if (s.wind_dir === undefined) return;
        rotateMarker(marker, s.wind_dir);
    })
    // console.log(sensors);
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

self.markerImage = "data:image/png;base64,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";