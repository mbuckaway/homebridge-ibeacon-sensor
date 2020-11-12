# homebridge-ibeacon-sensor
Bluetooth iBeacon Sensor for detecting occupancy for homebridge

Project Status: Dead
- While the code does work, and it will detect a beacon, it will not reliably detect if the beacon leaves the area and returns. The implementation scans for beacons, and the underlying code is broken. The scans must be reset on regular intervals. That was a quick way of attempt to implement the project. The "correct" way seems to be to actually connect to beacon, and use the connection succcess or failure as a way to determine if the beacon is in range. This part has yet to be implemented.

I've given up on Homebridge and moved development to ESP32 based HomeKit devices. See the new ESP32 Garage Door controller for example.

