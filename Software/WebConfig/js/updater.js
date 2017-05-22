(function(window, document) {
"use strict";

var pageSize = 128;
// full size - bootloader
var flashSize = (16 * 1024) - (2 * 1024);

var COMMAND_VERSION           = 0x03;
var COMMAND_STARTAPPLICATION  = 0x04;
var COMMAND_PROGRAM           = 0x05;

var WEBUSB_ID = 0x01;
var MS_OS_ID = 0x02;
var CONFIG_ID = 0x03;

function getLatest() {
    return new Promise ((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open("GET", "firmwares/latest.json", true);
        req.responseType = "json";

        req.onload = function (oEvent) {
            if (req.response) {
                resolve(req.response);
            } else {
                reject(Error(req.status + ": Could not fetch latest firmware information"));
            }
        };

        req.send();
    });
};

function downloadLatest(version) {
    return new Promise ((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open("GET", "firmwares/PocketVoltex_" + version + ".bin", true);
        req.responseType = "arraybuffer";

        req.onload = function (oEvent) {
            var arrayBuffer = req.response;
            if (arrayBuffer) {
                var view = new Uint8Array(arrayBuffer);
                if(view.length <= flashSize) {
                    resolve(view);
                } else {
                    reject(Error("Firmware too big! Must be under " +flashSize + ", got " + arrayBuffer.length));
                }
            } else {
                reject(Error(req.status + ": Could not fetch firmware version " + version));
            }
        };

        req.send();
    })
};

function programLatest(device, hex) {
    var p = Promise.resolve();
    for(let addr = 0; addr < hex.length; addr += pageSize) {
        let page = hex.subarray(addr, addr+pageSize);
        p = p.then(() => {
            // pad to 0s when size smaller
            let packet = new Uint8Array(new ArrayBuffer(pageSize));
            packet.set(page);
            console.log(Math.round(addr / hex.length * 100) + '%');
            return device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: CONFIG_ID,
                value: addr,
                index: COMMAND_PROGRAM}, packet);
        });
    }
    p = p.then(() => {
        console.log("Rebooting...");
        return device.controlTransferOut({
                requestType: 'vendor',
                recipient: 'device',
                request: CONFIG_ID,
                value: 0,
                index: COMMAND_STARTAPPLICATION}, []);
    });
    return p;
}

window.downloadLatest = downloadLatest;
window.getLatest = getLatest;
window.programLatest = programLatest;

})(window, document);