import * as crypto from 'irisnet-crypto'

const fee = {
    amount: [
        {denom: process.env.VUE_APP_HUB_TX_FEE_DENOM, amount: process.env.VUE_APP_HUB_TX_FEE}
    ],
    gasLimit: '200000'
}

const chainID = process.env.VUE_APP_HUB_CHAIN_ID
const slippageRate = 0.01
let key = {}

export class CoinSwap {
    constructor(client) {
        this.client = client
    }

    initKey() {
        let storage = window.localStorage;
        let keyHex = storage.getItem("iriscoinswap")
        if (keyHex == null) {
            return "not found"
        }
        key = crypto.getCrypto("iris").import(keyHex)
    }

    sendSwapTx(input, output, recipient, isBuyOrder) {
        if (isBuyOrder) {
            input.amount = (input.amount * (1 + slippageRate)).toFixed()
        } else {
            output.amount = (output.amount * (1 - slippageRate)).toFixed()
        }
        return this._sendRawTransaction('swap_order', {
            input: input,
            output: output,
            recipient: recipient,
            isBuyOrder: isBuyOrder
        })
    }

    sendAddLiquidityTx(maxToken, exactIrisAmt, minLiquidity, isCreate) {
        if (!isCreate) {
            maxToken.amount = (maxToken.amount * (1 + slippageRate)).toFixed()
        }
        minLiquidity = (minLiquidity * (1 - slippageRate)).toFixed()
        return this._sendRawTransaction('add_liquidity', {
            maxToken: maxToken,
            exactIrisAmt: exactIrisAmt,
            minLiquidity: minLiquidity
        })
    }

    sendRemoveLiquidityTx(withdrawLiquidity, minIrisAmt, minToken) {
        minIrisAmt = (minIrisAmt * (1 - slippageRate)).toFixed()
        minToken = (minToken * (1 - slippageRate)).toFixed()
        return this._sendRawTransaction('remove_liquidity', {
            withdrawLiquidity: withdrawLiquidity,
            minIrisAmt: minIrisAmt,
            minToken: minToken
        })
    }

    _sendRawTransaction(type, req) {
        let parent = this
        return parent._getAddressAndPubKey().then(async account => {
            window.console.log(account)
            let result = await parent.client.getAccount(account.address)
            let acc = result.account
            let msgs = null
            switch (type) {
                case 'swap_order': {
                    msgs = this._createMsgSwap(account.address, req)
                    break
                }
                case 'add_liquidity': {
                    msgs = this._createAddLiquidityMsg(account.address, req)
                    break
                }
                case 'remove_liquidity': {
                    msgs = this._createRemoveLiquidityMsg(account.address, req)
                    break
                }
                default: {
                    throw new Error('unsupport msgs')
                }
            }
            let tx = {
                chain_id: chainID,
                account_number: acc.account_number,
                sequence: acc.sequence,
                fee: fee,
                msgs: msgs,
                mode: "normal",
            }

            let builder = crypto.getBuilder("iris");
            let stdTx = builder.buildAndSignTx(tx, key.privateKey);
            let payload = stdTx.getData();
            return parent.client.sendRawTransaction(process.env.VUE_APP_RPC_SERVER, payload, {mode: 'commit'})
        }).catch(e => {
            window.console.log(e)
            throw e
        })
    }

    _createMsgSwap(sender, req) {
        if (!req.recipient) {
            req.recipient = sender
        }
        return [{
            type: 'swap_order',
            value: {
                input: {
                    address: sender,
                    coin: req.input,
                },
                output: {
                    address: req.recipient,
                    coin: req.output,
                },
                deadline: new Date().getTime(),
                isBuyOrder: req.isBuyOrder
            }
        }]
    }

    _createAddLiquidityMsg(sender, req) {
        return [{
            type: 'add_liquidity',
            value: {
                max_token: req.maxToken,
                exact_standard_amt: req.exactIrisAmt,
                min_liquidity: req.minLiquidity,
                deadline: new Date().getTime(),
                sender: sender
            }
        }]
    }

    _createRemoveLiquidityMsg(sender, req) {
        return [{
            type: 'remove_liquidity',
            value: {
                withdraw_liquidity: req.withdrawLiquidity,
                min_token: req.minToken,
                min_standard_amt: req.minIrisAmt,
                deadline: new Date().getTime(),
                sender: sender
            }
        }]
    }

    async _getAddressAndPubKey() {
        return key
    }

    importKey(mnemonic) {
        try {
            let iriscrypto = crypto.getCrypto("iris")
            let key = iriscrypto.recover(mnemonic, "english")
            if (key.privateKey) {
                let storage = window.localStorage;
                storage.setItem("iriscoinswap", key.privateKey)
            }
        } catch (e) {
            return e
        }
    }
}

export class Token {
    static getUniDenom(tokenId) {
        return `uni:${tokenId}`
    }

    static getMainDenom(denom) {
        if (denom === 'uni:iris') {
            return 'IRIS'
        }
        let domain = denom.replace('uni:', '')
        return domain.toUpperCase()
    }

    static minTokenToUniDenom(denom, tokens) {
        if (denom === 'uiris') {
            return 'uni:iris'
        }
        denom = tokens[denom]
        return `uni:${denom}`
    }

    static uniDenomToMinDenom(denom, tokens) {
        if (denom === 'uni:iris') {
            return 'uiris'
        }
        let domain = denom.replace('uni:', '')
        return tokens[domain]
    }

    static toFix(amount) {
        return Number(amount).toFixed(10)
    }
}
