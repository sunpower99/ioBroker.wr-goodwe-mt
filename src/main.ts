/*
 * Created with @iobroker/create-adapter v2.3.0
 */

import * as utils from '@iobroker/adapter-core';
import ModbusRTU from 'modbus-serial';
import * as protocoll from '/home/pi/ioBroker.wr-goodwe-mt/src/protocol.json';

class WrGoodweMt extends utils.Adapter {
    private client = new ModbusRTU();
    private ids: number[] = [];

    private sleep = (ms:any) => new Promise(resolve => setTimeout(resolve, ms));

    public constructor(options: Partial<utils.AdapterOptions> = {}) {
        super({
            ...options,
            name: 'wr-goodwe-mt',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        this.config.startID = 2;
        this.config.endID = 3;
        this.ids = new Array(this.config.endID-this.config.startID+1);
        this.log.debug("Start ID:" + String(this.config.startID));
        this.log.debug("End ID:" + String(this.config.endID));
        this.setState('info.connection', false, true);7

        for(let i =this.config.startID; i <=this.config.endID; i++){
            this.ids[i-this.config.startID] = i;


            await this.setObjectNotExistsAsync('WR'+i, {
                type: 'channel',
                common: {
                    name: 'WR'+i,
                },
                native: {},
            });
        }

        //try{
        this.client.connectRTUBuffered('/dev/ttyUSB0', { baudRate: 9600 , parity: 'none', dataBits: 8, stopBits: 1, });
        await this.startComm();
        await this.client.setTimeout(1000);
        //}
        // catch(e: any){
        //   this.log.error(String(e.message));
        //}
    }

    private async read(register: number):Promise<number>{
        try{
            const val =  await this.client.readHoldingRegisters(register, 1);
            const bu = Buffer.from([val.buffer[0],val.buffer[1]]);
            return bu.readInt16BE(0);
        }
        catch(e: any){
            this.log.error(String(e.message));
            this.log.info('hier2')
            await this.sleep(200);
            return -1;
        }
    }

    private async startComm():Promise<void>{
        const metersIdList = this.ids;
        const getMeterValue = async (id:number) => {

            for(let i = 0; i < protocoll.Adresses.length; i++){
                this.log.info('WR'+id+'.'+protocoll.Adresses[i].Name);

                await this.setObjectNotExistsAsync('WR'+id+'.'+protocoll.Adresses[i].Name, {
                    type: 'state',
                    common: {
                        name: protocoll.Adresses[i].Name,
                        type: 'number',
                        role: 'indicator',
                        read: true,
                        unit: protocoll.Adresses[i].Unit,
                        write: true,
                    },
                    native: {},
                });
                await this.client.setID(id);
                const val = await this.read(protocoll.Adresses[i].Register[0]);
                await this.setState('WR'+id+'.'+protocoll.Adresses[i].Name, val*protocoll.Adresses[i].Factor);
            }
            return 1;
        }

        const getMetersValue = async (meters:any) => {
            try{
                if(this.client.isOpen){
                    this.setState('info.connection', true, true);
                }
                else{
                    this.setState('info.connection', false, true);
                }
                for(const meter of meters) {
                    //this.log.info('test')
                    await getMeterValue(meter);
                    await this.sleep(1000);
                }
            } catch(e: any){
                //this.log.info('crash')
            } finally {
                setImmediate(() => {
                    getMetersValue(metersIdList);
                })
            }
        }
        // Abregelung starten
        getMetersValue(metersIdList);
    }

    private onUnload(callback: () => void): void {
        try {
            //this.log.debug('vor schließen:'+String(this.client.isOpen))
            //this.client.close;
            ///this.log.debug('nach schließen:'+String(this.client.isOpen))
            callback();
        } catch (e) {
            callback();
        }
    }


    private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            this.log.info(`state ${id} deleted`);
        }
    }
}

if (require.main !== module) {
    module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new WrGoodweMt(options);
} else {
    (() => new WrGoodweMt())();
}