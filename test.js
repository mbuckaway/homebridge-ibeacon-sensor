const beaconclass = require('./lib/beaconcontroller');


var config = {
    "verboselog": false,
    "showcurrentrssi": false,
    "showenter": true,
    "serviceUUIDs": ["feaa", "fff0"],
    "heartbeatInterval" : 2000,
    "reportInterval": 60000,
    "skipfirstenter": true,
    "beacons" :
    [
        {
            "uuid": "DC:0D:30:46:EE:E2",
            "rssi_enter_threshold": -80,
            "rssi_exit_threshold": -90,
            "exit_graceperiod": 5000,
            "name": "Car Beacon"
        },
        {
            "uuid": "DC:0D:30:46:09:40",
            "rssi_enter_threshold": -70,
            "rssi_exit_threshold": -80,
            "exit_graceperiod": 5000,
            "name": "Backpack Beacon"
        },
    ],
};

function beaconEntered(beacon)
{
    console.log("Beacon " + beacon.name + " entered (uuid: " + beacon.peripheral.address + " rssi: " + beacon.peripheral.rssi + " advertname: " + beacon.peripheral.advertisement.localName + ")");
}

function beaconExited(beacon)
{
    console.log("Beacon " + beacon.name + " exited (rssi: " + beacon.peripheral.rssi + ")");
}

var beaconController = new beaconclass.BeaconController(console.log, config);
var beaconList = beaconController.BeaconList;
for (var beaconId in beaconList)
{
    console.log("Beacon Id: " + beaconId + " Name: " + beaconList[beaconId].name);
}

beaconController.on('entered', beaconEntered);
beaconController.on('exited', beaconExited);

