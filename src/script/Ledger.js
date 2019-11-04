import TransportWebUSB from '@ledgerhq/hw-transport-webusb';
import * as crypto from "iris-crypto"

const path = [44, 118, 0, 0, 0];

export class Ledger{
    constructor(){
        this.app = null;
        _createLedgerApp(ledgerApp => {
            this.app = ledgerApp;
        });
    }

    getAddressAndPubKey() {
        return this.app.getAddressAndPubKey(path,"faa").then((result) => {
            return {addr :result.bech32_address,pubKey:result.compressed_pk};
        });
    }
    signTx(msg) {
        return this.app.sign(path, msg).then((response) => {
            return response.signature;
        });
    }
    isActive(){
        return this.app !== null
    }
}

function _createLedgerApp(callback) {
    TransportWebUSB.create().then(transport =>{
        crypto.getLedger().create(transport).then(app => {
            callback(app)
        });
    });
}
