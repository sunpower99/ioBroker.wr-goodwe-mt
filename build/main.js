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
var protocoll = __toESM(require("/home/pi/ioBroker.wr-goodwe-mt/src/protocol.json"));
class WrGoodweMt extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: "wr-goodwe-mt"
    });
    this.client = new import_modbus_serial.default();
    this.ids = [];
    this.sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }
  async onReady() {
    this.config.startID = 2;
    this.config.endID = 3;
    this.ids = new Array(this.config.endID - this.config.startID + 1);
    this.log.debug("Start ID:" + String(this.config.startID));
    this.log.debug("End ID:" + String(this.config.endID));
    this.setState("info.connection", false, true);
    7;
    for (let i = this.config.startID; i <= this.config.endID; i++) {
      this.ids[i - this.config.startID] = i;
      await this.setObjectNotExistsAsync("WR" + i, {
        type: "channel",
        common: {
          name: "WR" + i
        },
        native: {}
      });
    }
    this.client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 9600, parity: "none", dataBits: 8, stopBits: 1 });
    await this.startComm();
    await this.client.setTimeout(1e3);
  }
  async read(register) {
    try {
      const val = await this.client.readHoldingRegisters(register, 1);
      const bu = Buffer.from([val.buffer[0], val.buffer[1]]);
      return bu.readInt16BE(0);
    } catch (e) {
      this.log.error(String(e.message));
      this.log.info("hier2");
      await this.sleep(200);
      return -1;
    }
  }
  async startComm() {
    const metersIdList = this.ids;
    const getMeterValue = async (id) => {
      for (let i = 0; i < protocoll.Adresses.length; i++) {
        this.log.info("WR" + id + "." + protocoll.Adresses[i].Name);
        await this.setObjectNotExistsAsync("WR" + id + "." + protocoll.Adresses[i].Name, {
          type: "state",
          common: {
            name: protocoll.Adresses[i].Name,
            type: "number",
            role: "indicator",
            read: true,
            unit: protocoll.Adresses[i].Unit,
            write: true
          },
          native: {}
        });
        await this.client.setID(id);
        const val = await this.read(protocoll.Adresses[i].Register[0]);
        await this.setState("WR" + id + "." + protocoll.Adresses[i].Name, val * protocoll.Adresses[i].Factor);
      }
      return 1;
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
          await this.sleep(1e3);
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
  onUnload(callback) {
    try {
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
