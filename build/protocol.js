"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var protocol_exports = {};
__export(protocol_exports, {
  protocol: () => protocol
});
module.exports = __toCommonJS(protocol_exports);
const protocol = {
  "Read": {
    "Code": 3,
    "Adresses": [
      {
        "Register": [512, 513, 514, 515, 516, 517, 518, 519],
        "Name": "SN",
        "Unit": "",
        "Datatype": 5,
        "Factor": 1
      },
      {
        "Register": [768],
        "Name": "Voltage_MPPT1",
        "Unit": "V",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [769],
        "Name": "Voltage_MPPT2",
        "Unit": "V",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [855],
        "Name": "Voltage_MPPT3",
        "Unit": "V",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [856],
        "Name": "Voltage_MPPT4",
        "Unit": "V",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [770],
        "Name": "Current_MPPT1",
        "Unit": "A",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [771],
        "Name": "Current_MPPT2",
        "Unit": "A",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [857],
        "Name": "Current_MPPT3",
        "Unit": "A",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [858],
        "Name": "Current_MPPT4",
        "Unit": "A",
        "Datatype": 2,
        "Factor": 0.1
      },
      {
        "Register": [854, 781],
        "Name": "Power",
        "Unit": "W",
        "Datatype": 3,
        "Factor": 1
      },
      {
        "Register": [783],
        "Name": "Temp_Inverter",
        "Unit": "\xB0C",
        "Datatype": 1,
        "Factor": 0.1
      },
      {
        "Register": [786, 787],
        "Name": "Energy_total",
        "Unit": "kWh",
        "Datatype": 3,
        "Factor": 0.1
      }
    ]
  },
  "Write": {
    "Code": 16,
    "Adresses": [
      {
        "Register": [256],
        "Name": "DC_Limitation",
        "Unit": "%",
        "Datatype": 2,
        "Factor": 1
      },
      {
        "Register": [257],
        "Name": "Reactive_Limitation",
        "Unit": "%",
        "Datatype": 2,
        "Factor": 1
      }
    ]
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  protocol
});
//# sourceMappingURL=protocol.js.map
