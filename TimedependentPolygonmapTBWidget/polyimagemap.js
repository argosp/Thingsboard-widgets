self.onInit = function () {
    var map = $('#TimeseriesPolygonImageMap');
    self.ctx.map = new TbMapWidgetV2('image-map', false, self.ctx, undefined, map);
    self.posFunc = self.ctx.map.map.posFunction;
    setTimeout(() => {
        self.mapleaflet = self.ctx.map.map.map;
        window.TimeseriesPolygonImageMapSelf = self;
        self.onResize();

        var markerImages = self.ctx.widgetConfig.settings.markerImages;
        if (markerImages.length >= 4) {
            self.arrowIcon = L.icon({
                iconUrl: markerImages[4],
                iconSize: [10, 10],
                // iconAnchor: [5, 5]
            });
        }
        // var marker = L.marker([-50,50], {
        //     icon: self.arrowIcon
        // }).addTo(self.mapleaflet);
        // let a = 50;
        // function rot() {
        //     a += 10;
        //     setMarkerOrientation(marker, a )
        //     setTimeout(rot, 200);
        // }
        // rot();
    }, 10);
};

function setMarkerOrientation(marker, angle) {
    var prevTrans = marker._icon.style.WebkitTransform.replace(/ rotate\(\d+deg\)/g, '');
    marker._icon.style.WebkitTransform = prevTrans + ' rotate(' + angle + 'deg)';
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

self.getCurrIndex = function () {
    return parseInt($('#TimeFrame')[0].value);
};

self.setCurrIndex = function (val) {
    $('#TimeFrame')[0].value = val;
    self.onDataUpdated();
};

self.getPolygonFrames = function() {
    const jsons = self.ctx.data.filter(prop => typeof prop.data[0][1] === "string");
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

self.onDataUpdated = function () {
    try {
        [polygonFrames, maxRange] = self.getPolygonFrames();
        $('#TimeFrame')[0].max = maxRange;
        $('#TimeFrameLabel')[0].value = self.showPolygonFrame(polygonFrames, self.getCurrIndex());
    } catch (err) {
        // console.log("JSON error:", self.ctx.data, err);
        // return;
    }
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