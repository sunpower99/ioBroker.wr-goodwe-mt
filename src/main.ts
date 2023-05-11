/*
 * Created with @iobroker/create-adapter v2.3.0
 */

import * as utils from '@iobroker/adapter-core';
import ModbusRTU from 'modbus-serial';
import {protocol} from './protocol';

class WrGoodweMt extends utils.Adapter {
    private client = new ModbusRTU();
    private ids: number[] = [];
    private iList = new Map<number,string>();

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

        this.client.connectRTUBuffered(this.config.Interface, { baudRate: 9600 , parity: 'none', dataBits: 8, stopBits: 1, });
        await this.client.setTimeout(1000);
        await this.sleep(2000);
        for(var i = this.config.startID; i <=this.config.endID; i++){
            this.ids[i-this.config.startID] = i;
            try{
                await this.client.setID(i);
                const val =  await this.client.readHoldingRegisters(protocol.Read.Adresses[0].Register[0], protocol.Read.Adresses[0].Register.length);
                this.log.error(String(val.buffer));
                this.iList.set(i,String(val.buffer));
                if(val.buffer!=undefined){
                    await this.setObjectNotExistsAsync(String(this.iList.get(i)), {
                        type: 'channel',
                        common: {
                        name: String(this.iList.get(i)),
                        },
                        native: {},
                    });
            }
            } catch(e: any){
                this.log.error("ID: "+i+": "+String(e.message));
            }
        }
        await this.startComm();

        await this.setObjectNotExistsAsync('DC_Power_Limitation', {
            type: 'state',
            common: {
                name: 'DC_Power_Limitation',
                type: 'number',
                role: 'indicator',
                read: true,
                unit: '%',
                write: true,
            },
            native: {},
        });
        await this.setState('DC_Power_Limitation', 100);

        await this.setObjectNotExistsAsync('Plant_ID', {
            type: 'state',
            common: {
                name: 'Plant_ID',
                type: 'string',
                role: 'indicator',
                read: true,
                unit: '',
                write: true,
            },
            native: {},
        });
        await this.setState('Plant_ID', this.config.plantID);
    }

    private conversionUint32(arr: number[]): number{
        let uint8bytes = Uint8Array.from(arr);
        let dataview = new DataView(uint8bytes.buffer);
        return  dataview.getUint32(0);
    }

    private conversionInt32(arr: number[]): number{
        let uint8bytes = Uint8Array.from(arr);
        let dataview = new DataView(uint8bytes.buffer);
        return  dataview.getInt32(0);
    }

    private async read(register: number [], adressPosition: number):Promise<number>{
        try{
            var puffer: number [] = [];

            for(var i = 0; i < register.length; i++){
                const val =  await this.client.readHoldingRegisters(register[i], 1);
                switch(protocol.Read.Adresses[adressPosition].Datatype){
                    case 1: puffer[i] = Buffer.from([val.buffer[0],val.buffer[1]]).readUint16BE(0); break;
                    case 2: puffer[i] = Buffer.from([val.buffer[0],val.buffer[1]]).readInt16BE(0);break;
                    case 3: puffer[2*i] =  Buffer.from([(val.buffer[0])]).readUInt8(); puffer[2*i+1] =  Buffer.from([(val.buffer[1])]).readUInt8(); break; 
                    case 4: puffer[2*i] =  Buffer.from([(val.buffer[0])]).readUInt8(); puffer[2*i+1] =  Buffer.from([(val.buffer[1])]).readUInt8(); break;
                    default: this.log.error("Not found"); break;
                }
            }
            switch(protocol.Read.Adresses[adressPosition].Datatype){
                case 1: return puffer[0];
                case 2: return puffer[0];
                case 3: return this.conversionUint32(puffer); 
                case 4: return this.conversionInt32(puffer);
                default: this.log.error("Not found"); return -1;
            }            
        }
        catch(e: any){
            this.log.error(String(e.message));
            return -1;
        }
    }

    private async startComm():Promise<void>{
        const metersIdList = this.ids;
        const getMeterValue = async (id:number) => {
            //await this.sleep(100);
            for(let i = 1; i < protocol.Read.Adresses.length; i++){
                if(this.iList.get(id)!= undefined){
                    await this.setObjectNotExistsAsync(this.iList.get(id)+'.'+protocol.Read.Adresses[i].Name, {
                        type: 'state',
                        common: {
                            name: protocol.Read.Adresses[i].Name,
                            type: 'number',
                            role: 'indicator',
                            read: true,
                            unit: protocol.Read.Adresses[i].Unit,
                            write: true,
                        },
                        native: {},
                    });
                    await this.client.setID(id);
                    const val = await this.read(protocol.Read.Adresses[i].Register, i);
                    if(val != -1){
                        await this.setState(String(this.iList.get(id))+'.'+protocol.Read.Adresses[i].Name, val*protocol.Read.Adresses[i].Factor);
                    }
                }
            }
            await this.limitPower();
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

    private async limitPower(): Promise<void> {
        
        this.getState('DC_Power_Limitation',  async (err, state) => {
            if(typeof state?.val === 'number'){
                try{
                    await this.client.writeRegisters(protocol.Write.Adresses[0].Register[0],[state?.val]);
                }
                catch(e:any){

                }
            }
        });
        await this.sleep(1000);
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