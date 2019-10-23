#
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

import paho.mqtt.client as mqtt
from time import sleep
import random
import numpy
import geopandas
from shapely.geometry import Point, Polygon
import pprint
import json

broker = "192.116.82.80"
topic_pub = 'v1/devices/me/telemetry'

attr_pub = 'v1/devices/me/attributes'


def on_message(client, userdata, message):
    print("message received ", str(message.payload.decode("utf-8")))
    print("message topic=", message.topic)
    print("message qos=", message.qos)
    print("message retain flag=", message.retain)


def on_connect(client, userdata, flags, rc):
    print("Connected flags"+str(flags)+"result code " + str(rc))


class Device(object):

    def __init__(self, name):
        self.name = name
        self.client = mqtt.Client()
        self.client.username_pw_set(name)
        self.client.on_message = on_message
        self.client.on_connect = on_connect
        self.client.connect('192.116.82.80', 1883, 1)
        self.client.loop_start()

    def pub(self):

        props = {"wind_dir": random.randrange(0,360), "wind_speed": random.randrange(0,10)}
        msg = '{%s}' % str(props)
        self.client.publish(topic_pub, msg)


deviceName = ["Wind1","Wind2","Wind3"]
DeviceList = [Device(x) for x in deviceName]

while True:
    for d in DeviceList:
        d.pub()
    sleep(5)

