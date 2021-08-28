self.onInit = function () {
    var map = $('#TimeseriesPolygonMap');
    self.ctx.map = new TbMapWidgetV2('openstreet-map',
        false, self.ctx, undefined, map);
    self.mapleaflet = self.ctx.map.map.map;
    window.TimeseriesPolygonMapSelf = self;
    //self.mapleaflet.panBy([200, 300]);
    self.mapleaflet.setView([32.7, 34.95], 9);
    // self.resizeMap();
    // console.log(self);
}

self.resizeMap = function () {
    self.mapleaflet._container.style.height = (self.ctx
        .height - 30) + "px";
}

self.clearPolygons = function () {
    if (!self.mapleaflet._layers) return;
    for (var i in self.mapleaflet._layers) {
        if (self.mapleaflet._layers[i]._path !== undefined) {
            try {
                self.mapleaflet.removeLayer(self.mapleaflet._layers[i]);
            } catch (e) {
                console.log("problem with " + e + self.mapleaflet._layers[i]);
            }

        }
    }

}

function parseJson(json) {
    var value = String(json).replace(/'/g, '\"');
    return JSON.parse(value);
}
self.showPolygons = function (parsed, color) {
    try {
        geojsonFeature = parsed.features;
    } catch (err) {
        return;
        // geojsonFeature = null
    }
    var myStyle = {
        "color": color,
        "opacity": 0.8
    };
    try {
        L.geoJSON(geojsonFeature, {
            style: myStyle
        }).addTo(self.mapleaflet);
    } catch (e) {
        console.log(e);
    }

};

self.updateTimeRange = function (parsed) {
    var maxRange = 0;
    for (i = 0; i < parsed.length; i++) {
        // var prop = self.ctx.data[i].data[0][1];
        // console.log(prop);
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
}
self.setCurrIndex = function (val) {
    // console.log('setCurrIndex', val);
    $('#TimeFrame')[0].value = val;
    self.onDataUpdated();
}
self.onDataUpdated = function () {
    try {
        var parsed = self.ctx.data.map(prop =>
            parseJson(
                prop.data[0][1]));
        self.updateTimeRange(parsed);
        var index = self.getCurrIndex();
        self.clearPolygons();
        // console.log(self.ctx.data);
        var valueName = undefined;
        for (i = 0; i < self.ctx.data.length; i++) {
            var poly = findCurrFrame(parsed[i], index);
            if (!poly) continue;
            valueName = poly.name;
            var color = self.ctx.data[i].dataKey.color;
            self.showPolygons(poly.value, color);
        }
        $('#TimeFrameLabel')[0].value = valueName ?
            valueName : '';
    } catch (err) { }
    self.ctx.map.update();
}

self.setNext = function () {
    var maxRange = parseInt($('#TimeFrame')[0].max);
    if (maxRange >= 1) {
        self.setCurrIndex((self.getCurrIndex() + 1) % (
            maxRange + 1));
    } else {
        self.setCurrIndex(0);
    }
}

self.Play = function () {
    self.playing = !self.playing
    $('#PlayButton').text(self.playing ? 'Stop' :
        'Play');
    clearInterval(self.playInterval);
    if (self.playing) {
        var delay = self.ctx.settings.playDelay || 500;
        self.playInterval = setInterval((function () {
            self.setNext()
        }).bind(this), delay);
    }
}

self.onResize = function () {
    self.ctx.map.resize();
    // self.resizeMap();
}

self.getSettingsSchema = function () {
    var tbScheme = TbMapWidgetV2.settingsSchema(
        'openstreet-map');
    return tbScheme;
}
self.getDataKeySettingsSchema = function () {
    return TbMapWidgetV2.dataKeySettingsSchema(
        'openstreet-map');
}
self.actionSources = function () {
    return TbMapWidgetV2.actionSources();
}
self.onDestroy = function () { }