var dapv2 = {};

(function() {
  'use strict';

  dapv2.getPorts = function() {
    return navigator.usb.getDevices().then(devices => {
      return devices.map(device => new dapv2.Port(device));
    });
  };

  dapv2.requestPort = function() {
    const filters = [
      { 'vendorId': 0x1209, 'productId': 0x6666 },
      { 'vendorId': 0x0d28, 'productId': 0x0204 },
    ];
    return navigator.usb.requestDevice({ 'filters': filters }).then(
      device => new dapv2.Port(device)
    );
  }

  dapv2.Port = function(device) {
    this.device_ = device;
    this.interfaceNumber_ = 0;
    this.endpointIn_ = 1;
    this.endpointOut_ = 1;
  };

  dapv2.Port.prototype.connect = function() {
    let readLoop = () => {
      /* out test
      const bootloader_cmd_setconfig_head = [0x00, 0x00, 0x00, 0x03];
      var arrayHead = new Uint8Array(bootloader_cmd_setconfig_head);
      this.device_.transferOut(this.endpointOut_, arrayHead);
      */
      this.device_.transferIn(this.endpointIn_, 512).then(result => {
        this.onReceive(result.data);
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };

    return this.device_.open()
        .then(() => {
          if (this.device_.configuration === null) {
            console.log("selectConfiguration(1)");
            return this.device_.selectConfiguration(1);
          }
        })
        .then(() => {
          //console.log(this);
          /*
          var configurationInterfaces = this.device_.configuration.interfaces;
          configurationInterfaces.forEach(element => {
            element.alternates.forEach(elementalt => {
              if (elementalt.interfaceClass==0xff) {
                this.interfaceNumber_ = element.interfaceNumber;
                elementalt.endpoints.forEach(elementendpoint => {
                  if (elementendpoint.direction == "out") {
                    this.endpointOut_ = elementendpoint.endpointNumber;
                  }
                  if (elementendpoint.direction=="in") {
                    this.endpointIn_ =elementendpoint.endpointNumber;
                  }
                })
              }
            })
          })
          */
        })
        .then(() => this.device_.claimInterface(this.interfaceNumber_))
        .then(() => this.device_.selectAlternateInterface(this.interfaceNumber_, 0))
        //.then(() => this.device_.controlTransferOut({
        //    'requestType': 'class',
        //    'recipient': 'interface',
        //    'request': 0x22,
        //    'value': 0x01,
        //    'index': this.interfaceNumber_}))
        .then(() => {
          //console.log("Start readLoop");
          readLoop();
        });
  };

  dapv2.Port.prototype.disconnect = function() {
    //return this.device_.controlTransferOut({
    //        'requestType': 'class',
    //        'recipient': 'interface',
    //        'request': 0x22,
    //        'value': 0x00,
    //        'index': this.interfaceNumber_})
    //    .then(() => this.device_.close());
    this.device_.close()
  };

  dapv2.Port.prototype.send = function(data) {
    return this.device_.transferOut(this.endpointOut_, data);
  };
})();
