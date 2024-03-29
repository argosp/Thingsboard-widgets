self.onInit = function () {
    var elemap = $('#TimeseriesPolygonImageMap');
    self.ctx.map = new TbMapWidgetV2('image-map', false, self.ctx, undefined, elemap);
    self.posFunc = self.ctx.map.map.posFunction;
    setTimeout(() => {
        self.mapleaflet = self.ctx.map.map.map;
        window.TimeseriesPolygonImageMapSelf = self;
        // self.onResize();
        // self.onDataUpdated();

        console.log(self);
    }, 10);
};

self.onDataUpdated = function () {
    self.drawPolygons();
    self.drawWindMarkers();
};

self.drawPolygons = function() {
    try {
        const index = self.getCurrIndex();
        [polygonFrames, maxRange] = self.getPolygonFrames();
        $('#TimeFrame')[0].max = maxRange;
        $('#TimeFrameLabel')[0].value = self.showPolygonFrame(polygonFrames, index);
    } catch (err) {
        console.log("JSON error:", self.ctx.data, err);
        return;
    }
};

self.clearPolygons = function () {
    if (!self.mapleaflet || !self.mapleaflet._layers) {
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
    if (!json || json === '') return undefined;
    var value = String(json).replace(/'/g, '\"');
    return JSON.parse(value);
}

function lerp(a, b, f) {
    return a + f * (b - a);
}

self.posOnMap = function (v) {
    if (self.ctx.map && self.ctx.map.map && self.ctx.map.map.imageOverlay && self.ctx.map.map.imageOverlay._bounds && self.posFunc) {
        const bounds = self.ctx.map.map.imageOverlay._bounds;
        var ne = bounds._northEast,
            sw = bounds._southWest;
        var pos = self.posFunc(v[0], v[1]);
        const y = lerp(ne.lat, sw.lat, pos.y);
        const x = lerp(sw.lng, ne.lng, pos.x);
        return [x, y];
    } else {
        return v;
    }
};

self.posFuncGeoJson = function (geojson) {
    geojson.forEach((g) => {
        g.geometry.coordinates = g.geometry.coordinates.map(shape => {
            return shape.map(self.posOnMap);
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

self.getPolygonFrames = function () {
    var maxRange = 0;
    const polygonFrames = [];
    for (var prop in self.ctx.data) {
        const data = self.ctx.data[prop].data;
        if (!data || !data.length || typeof data[0][1] !== "string" || data[0][1][0]!=='{') continue;
        const frames = parseJson(data[0][1]);
        if (frames === undefined) continue;
        if (frames.length && frames[0].index) {
            const indices = frames.map(b => b.index);
            maxRange = Math.max(maxRange, Math.max.apply(this, indices));
        }
        polygonFrames.push({
            frames: frames,
            color: self.ctx.data[prop].dataKey.color
        });
    }
    return [polygonFrames, maxRange];
};

self.showPolygonFrame = function (polygonFrames, index) {
    let valueName = '';
    self.clearPolygons();
    polygonFrames.forEach(polys => {
        let poly = polys.frames;
        if (polys.frames.length) {
            poly = polys.frames.find(frame => parseInt(frame.index) === index);
            if (poly) {
                valueName = poly.name;
                self.showPolygons(poly.value, polys.color);
            }
        } else if (poly) {
            self.showPolygons(poly, polys.color);
        }
    });
    self.ctx.map.update();
    return valueName ? valueName : '';
};

/////////////// WIND //////////////////
self.drawWindMarkers = function() {
    if (!self.mapleaflet) return undefined;
    (self.windMarkers || []).forEach(m => m.removeFrom(self.mapleaflet));
    const dirs = self.getDirectionTelemetry();
    console.log(dirs);
    self.windMarkers = dirs.map(self.showDirectionMarker);
    self.windMarkers = self.windMarkers.filter(a => a);
};

self.getDirectionTelemetry = function () {
    // console.log(self.ctx.data);
    const nonJsons = self.ctx.data.filter(prop => prop.data.length > 0 && typeof prop.data[0][1] !== "string");
    let devices = {};
    nonJsons.forEach(prop => {
        const t = prop.datasource.name;
        devices[t] = devices[t] || {device: t};
        const kind = prop.dataKey.name;
        devices[t][kind] = prop.data[0][1];
    });
    return Object.values(devices);
};

self.showDirectionMarker = function (s) {
    if (s.xPos === undefined || s.yPos === undefined) return undefined;
    dir = 0;
    power = 1;
    if (s.u !== undefined && s.v !== undefined) {
        dir = Math.atan2(s.v, s.u);
        power = Math.sqrt(s.u * s.u + s.v * s.v);
    }
    const powerSize = power * self.ctx.settings.ArrowLenAt4;
    let inverseArrow = /(Win32|Win64)/i.test(navigator.platform);
    if (self.ctx.settings.InverseArrow) {
        inverseArrow = !inverseArrow;
    }

    if (inverseArrow) dir = (dir + 180) % 360;

    // const pos = self.posOnMap([s.latitude, s.longitude]);
    const pos = self.posOnMap([s.xPos, s.yPos]);
    var marker = L.marker([pos[1], pos[0]], {
        icon: L.icon({
            iconUrl: self.ctx.settings.arrowImageUrl,
            iconSize: [powerSize, parseFloat(self.ctx.settings.ArrowWidth)]
        }),
        rotationAngle: 360 - dir % 360, // counter clockwise
        rotationOrigin: 'center'
    }).addTo(self.mapleaflet);

    return marker;
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

self.resizeMap = function () {
    if (!self.mapleaflet || !self.mapleaflet._container) {
        return;
    }
    self.mapleaflet._container.style.height = (self.ctx.height - 30) + "px";
    self.mapleaflet.invalidateSize();
};

function addProp(tbScheme, name, type, props) {
    if (tbScheme.groupInfoes[0].GroupTitle !== 'Argos') {
        tbScheme.groupInfoes.forEach(inf => inf.formIndex += 1);
        tbScheme.groupInfoes.unshift({formIndex: 0, GroupTitle: "Argos"});
        tbScheme.form.unshift([]);
    }
    if (type) {
        tbScheme.form[0].push({key: name, type: type});
    } else {
        tbScheme.form[0].push(name);
    }
    tbScheme.schema.properties[name] = props;
}

self.getSettingsSchema = function () {
    var tbScheme = JSON.parse(JSON.stringify(TbMapWidgetV2.settingsSchema('image-map')));
    console.log(tbScheme);
    addProp(tbScheme, "InverseArrow", 0, {"title": "Inverse Arrow's U and V directions","type": "boolean","default": false});
    addProp(tbScheme, "playDelay", 0, {"title": "Play delay","type": "number","default": 500});
    addProp(tbScheme, "ArrowLenAt4", 0, {
            "title": "Arrow length in pixels when power/speed is 4",
            "type": "number",
            "default": 40
        });
    addProp(tbScheme, "ArrowWidth", 0, {
            "title": "Arrow width in pixels",
            "type": "number",
            "default": 40
        });
    addProp(tbScheme, "arrowImageUrl", "image" , {
            "title": "Arrow image",
            "type": "string",
            "default": "data:image/png;base64,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"
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

(function () {
    // save these original methods before they are overwritten
    var proto_initIcon = L.Marker.prototype._initIcon;
    var proto_setPos = L.Marker.prototype._setPos;

    var oldIE = (L.DomUtil.TRANSFORM === 'msTransform');

    L.Marker.addInitHook(function () {
        var iconOptions = this.options.icon && this.options.icon.options;
        var iconAnchor = iconOptions && this.options.icon.options.iconAnchor;
        if (iconAnchor) {
            iconAnchor = (iconAnchor[0] + 'px ' + iconAnchor[1] + 'px');
        }
        this.options.rotationOrigin = this.options.rotationOrigin || iconAnchor || 'center bottom';
        this.options.rotationAngle = this.options.rotationAngle || 0;

        // Ensure marker keeps rotated during dragging
        this.on('drag', function (e) { e.target._applyRotation(); });
    });

    L.Marker.include({
        _initIcon: function () {
            proto_initIcon.call(this);
        },

        _setPos: function (pos) {
            proto_setPos.call(this, pos);
            this._applyRotation();
        },

        _applyRotation: function () {
            if (this.options.rotationAngle) {
                this._icon.style[L.DomUtil.TRANSFORM + 'Origin'] = this.options.rotationOrigin;

                // console.log(this.options.rotationAngle);
                // if(oldIE) {
                //     // for IE 9, use the 2D rotation
                // this._icon.style[L.DomUtil.TRANSFORM] = 'rotate(' + this.options.rotationAngle + 'deg)';
                // } else {
                //     // for modern browsers, prefer the 3D accelerated version
                this._icon.style[L.DomUtil.TRANSFORM] =
                    this._icon.style[L.DomUtil.TRANSFORM].replace(/ rotateZ\(\d+deg\)/g, '')
                    + ' rotateZ(' + this.options.rotationAngle + 'deg)';
                // }
            }
        },

        setRotationAngle: function (angle) {
            this.options.rotationAngle = angle;
            this.update();
            return this;
        },

        setRotationOrigin: function (origin) {
            this.options.rotationOrigin = origin;
            this.update();
            return this;
        }
    });
})();
