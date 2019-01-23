const beaconclass = require('./lib/beaconcontroller');
const homebridgeLib = require('homebridge-lib')

let Service, Characteristic;
const OFF = true;
const ON = false;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-ibeacon-sensor", "Beacon Sensor", BeaconSensor);
};

class BeaconSensor {
  constructor(log, configJson)
  {
        this.log = log;
        // Config option defaults
        this.config = {
            name: "Beacon Sensor",
            accessory: "Beacon Sensor",
            verboselog: false,
            showcurrentrssi: false,
            showenter: true,
            serviceUUIDs: ['feaa', 'fff0'],
            heartbeatInterval : 2000,
            reportInterval: 0,
            skipfirstenter: true,
            beacons : []
        }
  
        // Parse the assessory config
        const optionParser = new homebridgeLib.OptionParser(this.config, true);
        optionParser.stringKey('name');
        optionParser.stringKey('accessory');
        optionParser.boolKey('verboselog');
        optionParser.boolKey('showcurrentrssi');
        optionParser.boolKey('showenter');
        optionParser.intKey('heartbeatInterval', 500, 5000);
        optionParser.intKey('reportInterval', 2000, 1000000);
        optionParser.boolKey('skipfirstenter');
        optionParser.listKey('serviceUUIDs');
        optionParser.listKey('beacons');

        optionParser.on('usageError', (message) => {
        this.log.warn('config.json: %s', message)
        });
        optionParser.parse(configJson);
        // Blindly copy the beacon list for now
        if (this.config.beacons)
        {
            this.config.beacons = configJson.beacons;
        }

        // Dump configuration
        this.log("Configuration: " + JSON.stringify(this.config));
        this.beaconcontroller = new beaconclass.BeaconController(log, this.config);
        this.beaconcontroller.on('entered', this.beaconEntered.bind(this));
        this.beaconcontroller.on('exited', this.beaconExited.bind(this));
        
        this.beaconservices = {};
        this.informationService = new Service.AccessoryInformation();

        this.informationService
        .setCharacteristic(Characteristic.Identify, 'BS-HACK-PLUGIN')
        .setCharacteristic(Characteristic.Manufacturer, 'HackMaster')
        .setCharacteristic(Characteristic.Model, 'Beacon Sensor Plugin')
        .setCharacteristic(Characteristic.Name, 'Beacon Sensor')
        .setCharacteristic(Characteristic.SerialNumber, 'ABC123458')
        .setCharacteristic(Characteristic.FirmwareRevision, '1.0');

        this.services = [this.informationService];

        var beaconList = this.beaconcontroller.BeaconList;
        // Create sensors for all beacons
        for (var beaconId in beaconList)
        {
            this.log("Beacon Id: " + beaconId);
            var name = beaconList[beaconId].name + " Occupancy Sensor";
            var newService = new Service.OccupancySensor(name, beaconId);
            this.setupBeaconService(newService, beaconList[beaconId].name, beaconId);
            this.beaconservices[beaconId] = newService;
            this.services.push(newService);
        }
    }

    identify(callback) {
        // If we had a light, we'd flash it
        this.log('Identify requested!');
        callback(null);
    }

    getServices ()
    {
        return this.services;
    }

    setupBeaconService(beaconservice, name, currentBeaconId)
    {
        this.log("Configuring " + name + " with id " + currentBeaconId);
        beaconservice.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
        beaconservice.setCharacteristic(Characteristic.StatusActive, true);

        beaconservice.getCharacteristic(Characteristic.OccupancyDetected)
        .on('get', (callback) => {
            this.log("State get requested for " + name + " with id: " + currentBeaconId);
            var beaconList = this.beaconcontroller.BeaconList;
            var beacon = beaconList[currentBeaconId];
            var result = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
            if (beacon)
            {
                if (beacon.inrange)
                {
                    this.log(name + " is OCCUPANCY_DETECTED");
                    result = Characteristic.OccupancyDetected.OCCUPANCY_DETECTED;
                }
                else
                {
                    this.log(name + " is OCCUPANCY_NOT_DETECTED");
                    result = Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED;
                }
            }
            else
            {
                this.log("ERROR currentBeaconId is not valid " + currentBeaconId + " for " + name);
            }
            callback(null, result);
        });
    
        beaconservice.getCharacteristic(Characteristic.Name)
        .on('get', callback => {
            callback(null, name);
        });
    }

    beaconEntered(beacon)
    {
        this.log("Beacon " + beacon.name + " entered (uuid: " + beacon.peripheral.address + " rssi: " + beacon.peripheral.rssi + " advertname: " + beacon.peripheral.advertisement.localName + ")");
        var service = this.beaconservices[beacon.peripheral.id];
        if (service)
        {
            this.log(beacon.name + " is OCCUPANCY_DETECTED");
            service.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_DETECTED);
        }
        else
        {
            this.log("ERROR: OnEnter: Unable to find beacon service with Id: " + beacon.peripheral.id);
        }
    }

    beaconExited(beacon)
    {
        this.log("Beacon " + beacon.name + " exited (rssi: " + beacon.peripheral.rssi + ")");
        var service = this.beaconservices[beacon.peripheral.id];
        if (service)
        {
            this.log(beacon.name + " is OCCUPANCY_NOT_DETECTED");
            service.setCharacteristic(Characteristic.OccupancyDetected, Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
        }
        else
        {
            this.log("ERROR: OnExited: Unable to find beacon service with Id: " + beacon.peripheral.id);
        }
    }
}