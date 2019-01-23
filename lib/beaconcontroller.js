/*
  Continously scans for peripherals and prints out message when they enter/exit

    In range criteria:      RSSI < threshold
    Out of range criteria:  lastSeen > grace period

  based on code provided by: Mattias Ask (http://www.dittlof.com)
*/

'use strict'

var noble = require('noble');
var Events = require('events');

class BeaconController extends Events
{
    constructor(log, options)
    {
        super();
        this.options = options;
        this.log = log;
        this.verboselog = options.verboselog;

        if (this.verboselog)
        {
            this.log(this.options);
        }
        // Setup a list of beacons
        this.beaconList = {};
        for (var beaconNo in this.options.beacons)
        {
            var beacon = this.options.beacons[beaconNo];
            if (this.verboselog) this.log(beacon);
            var id = beacon.uuid.split(':').join('').toLowerCase();
            this.beaconList[id] = 
            {
                name: beacon.name,
                peripheral: null,
                inrange: false,
                lastSeen: new Date(2018, 1, 1, 0, 0, 0),
                rssi_enter_threshold: beacon.rssi_enter_threshold,
                rssi_exit_threshold: beacon.rssi_exit_threshold,
                exit_graceperiod: beacon.exit_graceperiod,
                entered: false,
                uuid: beacon.uuid
            };
            this.log("Added beacon: " + beacon.name + "(" + id + ")");
        }
        // Setup the callbacks
        noble.on('scanStart', this.onStartScan.bind(this));
        noble.on('scanStop', this.onScanStop.bind(this));
        noble.on('discover', this.onDiscovery.bind(this));
        setInterval(this.onHeartbeat.bind(this), this.options.heartbeatInterval);
        if (this.options.reportInterval>0)
        {
            setInterval(this.onReportInterval.bind(this), this.options.reportInterval);
        }
        else
        {
            this.log("Report interval disabled");
        }
        noble.on('stateChange', this.onStateChange.bind(this));
    }

    get BeaconList()
    {
        return this.beaconList;
    }

    onDiscovery(peripheral) {
        var id = peripheral.id;
        if (this.verboselog) this.log("Found id: " + id + " data: " + peripheral);

        // Only discover beacons we care about
        if (this.beaconList[id] == null)
        {
            return;
        }
        var beacon = this.beaconList[id];
        
        if (this.options.showcurrentrssi) this.log("Current RSSI on " + peripheral.advertisement.localName + "[" + id + "]: " + peripheral.rssi);
    
        beacon.peripheral = peripheral;
        beacon.lastSeen = Date.now();

        // If we are were out of range, and now we are in range, process
        if (!beacon.inrange && (peripheral.rssi > beacon.rssi_enter_threshold)) {
            beacon.inrange = true;
            if (this.options.showenter) this.log('"' + peripheral.advertisement.localName + "(" + peripheral.id + ')" entered (RSSI ' + peripheral.rssi + ' Threshold: ' + beacon.rssi_enter_threshold + ') ' + new Date());
            if (this.options.skipfirstenter && !beacon.entered)
            {
                this.log("Skip first enter on " + beacon.name);
                beacon.entered = true;
            }
            else
            {
                beacon.entered = true;
                this.emit('entered', beacon);
            }
        }
        else if (beacon.inrange && (peripheral.rssi < beacon.rssi_exit_threshold))
        {
            beacon.inrange = false;
            if (this.options.showenter) this.log('"' + peripheral.advertisement.localName + "(" + peripheral.id + ')" exited (RSSI ' + peripheral.rssi +' Threshold: ' + beacon.rssi_exit_threshold + ') ' + new Date());
            // Only fire one that has entered
            if (beacon.entered) this.emit('exited', beacon);
        }
    }

    onReportInterval()
    {
        for (var id in this.beaconList) {
            var beacon = this.beaconList[id];
            if (beacon.peripheral)
            {
                this.log("Beacon Status [" + beacon.name + "] LocalName: [" + beacon.peripheral.advertisement.localName + "] RSSI: [" + beacon.peripheral.rssi + "] In Range: [" + beacon.inrange + "] Last Seen: " + new Date(beacon.lastSeen).toISOString());
            }
            else
            {
                this.log("Beacon Status [" + beacon.name + "] LocalName: [n/a] RSSI: [out of range] In Range: [" + beacon.inrange + "] Last Seen: " + new Date(beacon.lastSeen).toISOString());
            }
        }
    }

    onHeartbeat()
    {
        for (var id in this.beaconList) {
            var beacon = this.beaconList[id];
            // Handle the case when we disappear completely
            if (beacon.inrange && (beacon.lastSeen < (Date.now() - beacon.exit_graceperiod))) {
                beacon.inrange = false;
                var peripheral = beacon.peripheral;
                if (this.options.showenter) this.log('"' + peripheral.advertisement.localName + '" heartbeat exited (RSSI ' + peripheral.rssi + ') ' + new Date(beacon.lastSeen).toISOString());
                this.emit('exited', beacon);
            }
        }
    }    

    onStartScan(filterDuplicates)
    {
        this.log("Bluetooth LE Scan started (Filter duplicates: " + filterDuplicates + ")");
    }

    onScanStop()
    {
        this.log("Bluetooth LE Scan stopped");
    }

    onStateChange(state)
    {
        if (state === 'poweredOn')
        {
            var serviceUUIDs = [];
            if (this.options.serviceUUIDs.length)
            {
                serviceUUIDs = this.options.serviceUUIDs;
                this.log("Filtering Service UUIDS: " + serviceUUIDs);
            }
            noble.startScanning(serviceUUIDs, true);
        }
        else
        {
            noble.stopScanning();
        }
    }    
};

module.exports = {
    BeaconController
};
