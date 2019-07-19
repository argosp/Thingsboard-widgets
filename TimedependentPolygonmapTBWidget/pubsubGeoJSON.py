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

broker="192.116.82.80"
topic_pub='v1/devices/me/telemetry'

attr_pub ='v1/devices/me/attributes'

def on_message(client, userdata, message):
    print("message received " ,str(message.payload.decode("utf-8")))
    print("message topic=",message.topic)
    print("message qos=",message.qos)
    print("message retain flag=",message.retain)

def on_connect(client, userdata, flags, rc):
     print("Connected flags"+str(flags)+"result code "     +str(rc))


class Device(object): 

	def __init__(self,name): 
		self.name = name 
		self.client = mqtt.Client()
		self.client.username_pw_set(name)
		self.client.on_message=on_message  
		self.client.on_connect= on_connect 
		self.client.connect('192.116.82.80', 1883, 1)
		self.client.loop_start()

	def pub(self): 
		
		R1 = random.randrange(3, 20)/100.
		R2 = R1 + random.randrange(3, 20)/100.
		R3 = R2 + random.randrange(3, 20)/100.

		angle = numpy.arange(0,2*numpy.pi,0.05)
		baseX = 35
		baseY  = 32.5

		X1 = baseX + R1*numpy.sin(angle)
		Y1 = baseY + R1*numpy.cos(angle)
		A1 = Polygon([[i[0],i[1]] for i in zip(X1,Y1)])
		A1s = str([[i[0],i[1]] for i in zip(X1,Y1)])

		
		X2 = baseX + R2*numpy.sin(angle)
		Y2 = baseY + R2*numpy.cos(angle)
		A2 = Polygon([[i[0],i[1]] for i in zip(X2,Y2)])


		X3 = baseX + R3*numpy.sin(angle)
		Y3 = baseY + R3*numpy.cos(angle)
		A3 = Polygon([[i[0],i[1]] for i in zip(X3,Y3)])

		G = geopandas.GeoDataFrame({'geometry' : [A1,A2,A3]})

		totalD = G.diff()
		totalD.iloc[0] = G.iloc[0]

		jsonL = []
		for name,i in zip(["A","B","C"],range(totalD.size)): 
			jsonL.append('"%s" : "%s"' %(name, totalD.iloc[i:i+1].to_json().replace('"',"'")))

		msg = '{%s}' % ",".join(jsonL)
		self.client.publish(topic_pub, msg) 

deviceName = ["A1_TEST_TOKEN"]
DeviceList = [Device(x) for x in deviceName]

while True:
	for d in DeviceList: 
		d.pub()
	sleep(1)
