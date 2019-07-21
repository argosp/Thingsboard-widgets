# Timedependent Polygon map TBWidget
------------------------------------

A first version of the Timedependent Polygon map TBWidget.

The widget assumes that the attribute of the device contain a single geoJSON.

To setup the example:

1. Install anaconda3, paho package.
1. Create a device in Thingsboard and change its token to A1_TEST_TOKEN. (The string in the pubsubJSON.py, line 88).
2. Change the IP of the server in pubsubJSON.py to be that of the server.
3. Create a new dashboard and define an alias of a single device. Choose the device.
4. Add 3 attributes A,B and C (they do not exist until you have published with the pubsub code, so either publish a new
   few messages or click on the create new attribute and change the name to A,B or C.

5. The pubsubJSON.py publishes the subtraction of the polygons from each other to maintain the colors.

Alternately to anaconda:

```
cd TimedependentPolygonmapTBWidget
python3 -m venv .env
source .env/bin/activate
pip install paho-mqtt numpy geopandas
python -m pubsubGeoJSONmulti.py
```
