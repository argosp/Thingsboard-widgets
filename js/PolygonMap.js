export default widget = {};

widget.onInit = function() {
    widget.ctx.map = new TbMapWidgetV2('openstreet-map',        false, widget.ctx);
    widget.mapleaflet = widget.ctx.map.map.map;
    //widget.mapleaflet.panBy([200, 300]);
    widget.mapleaflet.setView([32, 34.95], 9);
}

widget.onDataUpdated = function() {
    for (var i in widget.mapleaflet._layers) {
        if (widget.mapleaflet._layers[i]._path !==
            undefined) {
            try {
                widget.mapleaflet.removeLayer(widget.mapleaflet
                    ._layers[i]);
            } catch (e) {
                console.log("problem with " + e + widget.mapleaflet._layers[i]);
            }

        }
    }

    for (i = 0; i < widget.ctx.data.length; i++) {
        try {
            var dataitem = widget.ctx.data[i];
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
            }).addTo(widget.mapleaflet);
        } catch (e) {
            console.log(e);
        }
        widget.ctx.map.update();
    }
}
widget.onResize = function() {
    widget.ctx.map.resize();
}
widget.getSettingsSchema = function() {
    var tbScheme = TbMapWidgetV2.settingsSchema(
        'openstreet-map');
    return tbScheme;
}
widget.getDataKeySettingsSchema = function() {
    return TbMapWidgetV2.dataKeySettingsSchema('openstreet-map');
}
widget.actionSources = function() {
    return TbMapWidgetV2.actionSources();
}
widget.onDestroy = function() {}
