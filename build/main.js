"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var utils = __toESM(require("@iobroker/adapter-core"));
var import_modbus_serial = __toESM(require("modbus-serial"));
var import_protocol = require("./protocol");
class WrGoodweMt extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "wr-goodwe-mt"
    });
    this.client = new import_modbus_serial.default();
    this.ids = [];
    this.iList = /* @__PURE__ */ new Map();
    this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.ids = new Array(this.config.endID - this.config.startID + 1);
    this.log.debug("Start ID:" + String(this.config.startID));
    this.log.debug("End ID:" + String(this.config.endID));
    this.setState("info.connection", false, true);
    this.client.connectRTUBuffered(this.config.Interface, { baudRate: 9600, parity: "none", dataBits: 8, stopBits: 1 });
    await this.client.setTimeout(1e4);
    await this.sleep(2e3);
    for (var i = this.config.startID; i <= this.config.endID; i++) {
      this.ids[i - this.config.startID] = i;
      try {
        await this.client.setID(i);
        const val = await this.client.readHoldingRegisters(import_protocol.protocol.Read.Adresses[0].Register[0], import_protocol.protocol.Read.Adresses[0].Register.length);
        this.log.error(String(val.buffer));
        this.iList.set(i, String(val.buffer));
        if (val.buffer != void 0) {
          await this.setObjectNotExistsAsync(String(this.iList.get(i)), {
            type: "channel",
            common: {
              name: String(this.iList.get(i))
            },
            native: {}
          });
        }
      } catch (e) {
        this.log.error("ID: " + i + ": " + String(e.message));
      }
    }
    await this.startComm();
    let objects = ["DC_Power_Limitation_DirectMarketer", "DC_Power_Limitation_GridOperator", "DC_Power_Limitation_GP_Protection"];
    for (let i2 = 0; i2 < objects.length; i2++) {
      await this.setObjectNotExistsAsync(objects[i2], {
        type: "state",
        common: {
          name: objects[i2],
          type: "number",
          role: "indicator",
          read: true,
          unit: "%",
          write: true
        },
        native: {}
      });
      await this.setState(objects[i2], 100);
    }
    await this.setObjectNotExistsAsync("Reactive_Power_Limitation_GridOperator", {
      type: "state",
      common: {
        name: objects[i],
        type: "number",
        role: "indicator",
        read: true,
        unit: "%",
        write: true
      },
      native: {}
    });
    await this.setState("Reactive_Power_Limitation_GridOperator", 0);
    await this.setObjectNotExistsAsync("Plant_ID", {
      type: "state",
      common: {
        name: "Plant_ID",
        type: "string",
        role: "indicator",
        read: true,
        unit: "",
        write: true
      },
      native: {}
    });
    await this.setState("Plant_ID", this.config.plantID);
  }
  conversionUint32(arr) {
    let uint8bytes = Uint8Array.from(arr);
    let dataview = new DataView(uint8bytes.buffer);
    return dataview.getUint32(0);
  }
  conversionInt32(arr) {
    let uint8bytes = Uint8Array.from(arr);
    let dataview = new DataView(uint8bytes.buffer);
    return dataview.getInt32(0);
  }
  async read(register, adressPosition) {
    try {
      var puffer = [];
      for (var i = 0; i < register.length; i++) {
        const val = await this.client.readHoldingRegisters(register[i], 1);
        switch (import_protocol.protocol.Read.Adresses[adressPosition].Datatype) {
          case 1:
            puffer[i] = Buffer.from([val.buffer[0], val.buffer[1]]).readUint16BE(0);
            break;
          case 2:
            puffer[i] = Buffer.from([val.buffer[0], val.buffer[1]]).readInt16BE(0);
            break;
          case 3:
            puffer[2 * i] = Buffer.from([val.buffer[0]]).readUInt8();
            puffer[2 * i + 1] = Buffer.from([val.buffer[1]]).readUInt8();
            break;
          case 4:
            puffer[2 * i] = Buffer.from([val.buffer[0]]).readUInt8();
            puffer[2 * i + 1] = Buffer.from([val.buffer[1]]).readUInt8();
            break;
          default:
            this.log.error("Not found");
            break;
        }
      }
      switch (import_protocol.protocol.Read.Adresses[adressPosition].Datatype) {
        case 1:
          return puffer[0];
        case 2:
          return puffer[0];
        case 3:
          return this.conversionUint32(puffer);
        case 4:
          return this.conversionInt32(puffer);
        default:
          this.log.error("Not found");
          return -1;
      }
    } catch (e) {
      this.log.error(String(e.message));
      return -1;
    }
  }
  async startComm() {
    const metersIdList = this.ids;
    const getMeterValue = async (id) => {
      for (let i = 1; i < import_protocol.protocol.Read.Adresses.length; i++) {
        if (this.iList.get(id) != void 0) {
          await this.setObjectNotExistsAsync(this.iList.get(id) + "." + import_protocol.protocol.Read.Adresses[i].Name, {
            type: "state",
            common: {
              name: import_protocol.protocol.Read.Adresses[i].Name,
              type: "number",
              role: "indicator",
              read: true,
              unit: import_protocol.protocol.Read.Adresses[i].Unit,
              write: true
            },
            native: {}
          });
          await this.client.setID(id);
          const val = await this.read(import_protocol.protocol.Read.Adresses[i].Register, i);
          if (val != -1) {
            await this.setState(String(this.iList.get(id)) + "." + import_protocol.protocol.Read.Adresses[i].Name, val * import_protocol.protocol.Read.Adresses[i].Factor);
          }
        }
      }
      await this.limit_DC_Power();
    };
    const getMetersValue = async (meters) => {
      try {
        if (this.client.isOpen) {
          this.setState("info.connection", true, true);
        } else {
          this.setState("info.connection", false, true);
        }
        for (const meter of meters) {
          await getMeterValue(meter);
        }
      } catch (e) {
      } finally {
        setImmediate(() => {
          getMetersValue(metersIdList);
        });
      }
    };
    getMetersValue(metersIdList);
  }
  async limit_DC_Power() {
    let objects = ["DC_Power_Limitation_DirectMarketer", "DC_Power_Limitation_GridOperator", "DC_Power_Limitation_GP_Protection"];
    let min = 100;
    for (let i = 0; i < objects.length; i++) {
      this.getState(objects[i], async (err, state) => {
        if (typeof (state == null ? void 0 : state.val) === "number") {
          try {
            if ((state == null ? void 0 : state.val) < min) {
              min = state == null ? void 0 : state.val;
            }
          } catch (e) {
          }
        }
      });
    }
    await this.client.writeRegisters(import_protocol.protocol.Write.Adresses[0].Register[0], [min]);
    await this.sleep(1e3);
  }
  async limit_Reactive_Power() {
    let objects = ["Reactive_Power_Limitation_GridOperator"];
    for (let i = 0; i < objects.length; i++) {
      this.getState(objects[i], async (err, state) => {
        if (typeof (state == null ? void 0 : state.val) === "number") {
          try {
            await this.client.writeRegisters(import_protocol.protocol.Write.Adresses[0].Register[1], [state == null ? void 0 : state.val]);
            await this.sleep(1e3);
          } catch (e) {
          }
        }
      });
    }
  }
  async onUnload(callback) {
    try {
      this.log.debug("vor schlie\xDFen:" + String(this.client.isOpen));
      await this.client.close(callback);
      this.log.debug("nach schlie\xDFen:" + String(this.client.isOpen));
      callback();
    } catch (e) {
      callback();
    }
  }
  onStateChange(id, state) {
    if (state) {
      this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
    } else {
      this.log.info(`state ${id} deleted`);
    }
  }
}
if (require.main !== module) {
  module.exports = (options) => new WrGoodweMt(options);
} else {
  (() => new WrGoodweMt())();
}
//# sourceMappingURL=main.js.map
