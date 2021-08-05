self.onInit = function() {
    console.log(self);
    self.ctx.map = new TbMapWidgetV2('openstreet-map',        false, self.ctx);
    self.mapleaflet = self.ctx.map.map.map;
    //self.mapleaflet.panBy([200, 300]);
    self.mapleaflet.setView([32, 34.95], 9);
}

self.onDataUpdated = function() {
    for (var i in self.mapleaflet._layers) {
        if (self.mapleaflet._layers[i]._path !==
            undefined) {
            try {
                self.mapleaflet.removeLayer(self.mapleaflet
                    ._layers[i]);
            } catch (e) {
                console.log("problem with " + e + self.mapleaflet._layers[i]);
            }

        }
    }

    for (i = 0; i < self.ctx.data.length; i++) {
        try {
            var dataitem = self.ctx.data[i];
            var value = String(dataitem.data[0][1]).replace(/'/g, '\"');
            var parsed = JSON.parse(value);
                geojsonFeature = parsed.features;
        } catch (err) {
            geojsonFeature = null
        }
        var myStyle = {
            "color": dataitem.dataKey.color,
            "opacity": 0.8
        };
        try {
            L.geoJSON(geojsonFeature, {
                style: myStyle
            }).addTo(self.mapleaflet);
        } catch (e) {
            console.log(e);
        }
        self.ctx.map.update();
    }
}
self.onResize = function() {
    self.ctx.map.resize();
}
self.getSettingsSchema = function() {
    var tbScheme = TbMapWidgetV2.settingsSchema(
        'openstreet-map');
    return tbScheme;
}
self.getDataKeySettingsSchema = function() {
    return TbMapWidgetV2.dataKeySettingsSchema('openstreet-map');
}
self.actionSources = function() {
    return TbMapWidgetV2.actionSources();
}
self.onDestroy = function() {}
