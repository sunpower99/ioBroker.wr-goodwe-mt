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
        this.on('unload', this.onUnload.bind(this));
    }

    private async onReady(): Promise<void> {
        this.ids = new Array(this.config.endID-this.config.startID+1);
        this.log.debug("Start ID:" + String(this.config.startID));
        this.log.debug("End ID:" + String(this.config.endID));
        this.setState('info.connection', false, true);

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

        this.client.connectRTUBuffered(this.config.Interface, { baudRate: 9600 , parity: 'none', dataBits: 8, stopBits: 1, });
        await this.startComm();
        await this.client.setTimeout(1000);
    }

    private conversionUint32(arr: number[]): number{
       /* var highbyte = arr[0];
        var lowbyte = arr[1];
        this.log.info(String(highbyte));
        this.log.info(String(lowbyte));
        //lowbyte = highbyte << 16;
        this.log.info(String(lowbyte));
        this.log.info(String(highbyte | lowbyte));
        return Buffer.from([highbyte,lowbyte]).readUint32BE(0);*/

        this.log.info(String(arr));
        //let bytes = [0, 6, 163, 31];
        let bytes = arr;
        let uint8bytes = Uint8Array.from(bytes);
        let dataview = new DataView(uint8bytes.buffer);
       // let int32le = dataview.getInt32(0, true); // second parameter truethy == want little endian
       this.log.info(String(dataview.getUint32(0)))
        return  dataview.getUint32(0);
    }

    private async read(register: number [], adressPosition: number):Promise<number>{
        try{
            var puffer: number [] = [];

            for(var i = 0; i < register.length; i++){
                const val =  await this.client.readHoldingRegisters(register[i], 1);
                switch(protocoll.Read.Adresses[adressPosition].Datatype){
                    case 1: puffer[i] = Buffer.from([val.buffer[0],val.buffer[1]]).readUint16BE(0); break;
                    case 2: puffer[i] = Buffer.from([val.buffer[0],val.buffer[1]]).readInt16BE(0);break;
                    case 3: puffer[2*i] =  Buffer.from([(val.buffer[0])]).readUInt8(); puffer[2*i+1] =  Buffer.from([(val.buffer[1])]).readUInt8(); break; 
                    case 4: puffer[i] =  Buffer.from([val.buffer[0],val.buffer[1]]).readInt16BE(0); break;
                    default: this.log.error("Not found"); break;
                }
            }
            switch(protocoll.Read.Adresses[adressPosition].Datatype){
                case 1: return puffer[0];
                case 2: return puffer[0];
                case 3: return this.conversionUint32(puffer); 
                case 4: return this.conversionUint32(puffer);
                default: this.log.error("Not found"); return -1000;
            }            
        }
        catch(e: any){
           // this.log.error(String(e.message));
            return -1;
        }
    }

    private async startComm():Promise<void>{
        const metersIdList = this.ids;
        const getMeterValue = async (id:number) => {

            for(let i = 0; i < protocoll.Read.Adresses.length; i++){
                this.log.debug('WR'+id+'.'+protocoll.Read.Adresses[i].Name);

                await this.setObjectNotExistsAsync('WR'+id+'.'+protocoll.Read.Adresses[i].Name, {
                    type: 'state',
                    common: {
                        name: protocoll.Read.Adresses[i].Name,
                        type: 'number',
                        role: 'indicator',
                        read: true,
                        unit: protocoll.Read.Adresses[i].Unit,
                        write: true,
                    },
                    native: {},
                });
                await this.client.setID(id);
                const val = await this.read(protocoll.Read.Adresses[i].Register, i);
                await this.setState('WR'+id+'.'+protocoll.Read.Adresses[i].Name, val*protocoll.Read.Adresses[i].Factor);
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
                    await getMeterValue(meter);
                    await this.sleep(100);
                }
            } catch(e: any){
            } finally {
                setImmediate(() => {
                    getMetersValue(metersIdList);
                })
            }
        }
        getMetersValue(metersIdList);
    }

    private async onUnload(callback: () => void): Promise<void> {
        try {
            this.log.debug('vor schließen:'+String(this.client.isOpen))
            await this.client.close(callback);
            this.log.debug('nach schließen:'+String(this.client.isOpen))
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