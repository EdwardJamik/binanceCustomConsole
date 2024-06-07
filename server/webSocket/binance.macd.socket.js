const axios = require('axios')
const {MACD} = require("technicalindicators");
const WebSocket = require('ws');
const Order = require('../models/orders.model')
const {createOrder} = require("../util/createOrder");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const socketServer = require("../server");

let close = [],
    orders = {},
    allowTrade = {},
    macdInput = [],
    macdCloseInput = [],
    sockets = {},
    current_interval = []

async function addSocket(id, symbol, interval, number, type, type_g, test, user) {
    try{
        console.log(id, symbol, interval, number, type, type_g, test)
        const ws = new WebSocket(`wss://${test ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${symbol.toLowerCase()}@kline_${interval}`);
        // fstream.binance // fstream.binancefuture
        ws.on('open', function open() {

            allowTrade[`${symbol}@${interval}@${id}`] = true
            orders[`${symbol}@${interval}@${id}`] = {id, type, number, type_g, test, result:0}
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] MACD CONNECTED:`,symbol,id,interval)
        });

        ws.on('close', async function close() {
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] MACD DISCONNECTED:`,symbol,id,interval)
            if (parseInt(orders[`${symbol}@${interval}@${id}`].result) !== parseInt(orders[`${symbol}@${interval}@${id}`].number) && allowTrade) {
                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] MACD RECONNECT:`,symbol,id,interval)
                addSocket(id, symbol, interval, type, type_g, test)
            } else if (parseInt(orders[`${symbol}@${interval}@${id}`].result) === parseInt(orders[`${symbol}@${interval}@${id}`].number) && allowTrade) {
                //CLOSE ORDER
                const findOrder = await Order.findOne({"ordersId.macd.status": true, "ordersId.macd.timeFrame":interval, "ordersId.macd.type_g":type_g, "ordersId.macd.type":type, "ordersId.macd.number":number, opened:true})

                const order = {...findOrder?.openedConfig, side: findOrder?.openedConfig?.positionSide === 'LONG' ? 'SELL' : 'BUY'}
                createOrder(order, user)
                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] MACD DISCONNECT:`,symbol,id,interval)
                delete orders[`${symbol}@${interval}@${id}`]
                delete macdCloseInput[`${symbol}@${interval}@${id}`]
                delete macdInput[`${symbol}@${interval}@${id}`]
                delete sockets[`${id}`]
                delete current_interval[`${symbol}@${interval}@${id}`]
                delete allowTrade[`${symbol}@${interval}@${id}`]
            }
        });

        ws.on('message', function incoming(data) {
            try {
                let {k: {s,i,c, x}} = JSON.parse(data);

                let symbol = s.toLowerCase();
                let interval = i // ???

                if (x) {
                    const preCloseLength = macdCloseInput[`${symbol}@${interval}@${id}`]?.length

                    close[`${symbol}@${interval}@${id}`].shift()
                    close[`${symbol}@${interval}@${id}`].splice(-1);
                    close[`${symbol}@${interval}@${id}`].push(parseFloat(c))
                    macdInput[`${symbol}@${interval}@${id}`].values = close[`${symbol}@${interval}@${id}`]
                    const calcs = MACD.calculate(macdInput[`${symbol}@${interval}@${id}`])
                    const pre_calcs = preCloseLength ? macdCloseInput[`${symbol}@${interval}@${id}`][preCloseLength-1] : parseFloat(calcs[calcs.length - 1].histogram)
                    console.log(`${new Date().toLocaleTimeString('uk-UA')} PRE`, parseFloat(pre_calcs))
                    console.log(`${new Date().toLocaleTimeString('uk-UA')} Calc`, parseFloat(calcs[calcs.length - 1].histogram))

                    if (orders[`${symbol}@${interval}@${id}`].type === 'short' && orders[`${symbol}@${interval}@${id}`].type_g === 'short') {
                        const result = parseInt(orders[`${symbol}@${interval}@${id}`].result)

                        if (parseFloat(pre_calcs) >= parseFloat(calcs[calcs.length - 1].histogram) && parseFloat(calcs[calcs.length - 1].histogram) < 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: result + 1
                            }
                        } else if (parseFloat(pre_calcs) <= parseFloat(calcs[calcs.length - 1].histogram) || parseFloat(calcs[calcs.length - 1].histogram) > 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: 0
                            }
                        }

                        if (parseInt(orders[`${symbol}@${interval}@${id}`].result) === parseInt(orders[`${symbol}@${interval}@${id}`].number)) {
                            sockets[`${id}`].close()
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'short short', true)
                        } else {
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'short short', false, parseInt(orders[`${symbol}@${interval}@${id}`].result), parseInt(orders[`${symbol}@${interval}@${id}`].number))
                        }

                    } else if (orders[`${symbol}@${interval}@${id}`].type === 'short' && orders[`${symbol}@${interval}@${id}`].type_g === 'long') {
                        const result = parseInt(orders[`${symbol}@${interval}@${id}`].result)

                        if (parseFloat(pre_calcs) <= parseFloat(calcs[calcs.length - 1].histogram) && parseFloat(calcs[calcs.length - 1].histogram) < 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: result + 1
                            }
                        } else if (parseFloat(pre_calcs) >= parseFloat(calcs[calcs.length - 1].histogram) || parseFloat(calcs[calcs.length - 1].histogram) > 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: 0
                            }
                        }

                        if (parseInt(orders[`${symbol}@${interval}@${id}`].result) === parseInt(orders[`${symbol}@${interval}@${id}`].number)) {
                            sockets[`${id}`].close()
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'short long', true)
                        } else {
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'short long', false, parseInt(orders[`${symbol}@${interval}@${id}`].result), parseInt(orders[`${symbol}@${interval}@${id}`].number))
                        }
                    } else if (orders[`${symbol}@${interval}@${id}`].type === 'long' && orders[`${symbol}@${interval}@${id}`].type_g === 'long') {
                        const result = parseInt(orders[`${symbol}@${interval}@${id}`].result)

                        if (parseFloat(pre_calcs) <= parseFloat(calcs[calcs.length - 1].histogram) && parseFloat(calcs[calcs.length - 1].histogram) > 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: result + 1
                            }
                        } else if (parseFloat(pre_calcs) >= parseFloat(calcs[calcs.length - 1].histogram) || parseFloat(calcs[calcs.length - 1].histogram) < 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: 0
                            }
                        }

                        if (parseInt(orders[`${symbol}@${interval}@${id}`].result) === parseInt(orders[`${symbol}@${interval}@${id}`].number)) {
                            sockets[`${id}`].close()
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'long long', true)
                        } else {
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'long long', false, parseInt(orders[`${symbol}@${interval}@${id}`].result), parseInt(orders[`${symbol}@${interval}@${id}`].number))
                        }
                    } else if (orders[`${symbol}@${interval}@${id}`].type === 'long' && orders[`${symbol}@${interval}@${id}`].type_g === 'short') {
                        const result = parseInt(orders[`${symbol}@${interval}@${id}`].result)

                        if (parseFloat(pre_calcs) >= parseFloat(calcs[calcs.length - 1].histogram) && parseFloat(calcs[calcs.length - 1].histogram) > 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: result + 1
                            }
                        } else if (parseFloat(pre_calcs) <= parseFloat(calcs[calcs.length - 1].histogram) || parseFloat(calcs[calcs.length - 1].histogram) < 0) {
                            orders[`${symbol}@${interval}@${id}`] = {
                                id,
                                type,
                                type_g,
                                number,
                                test,
                                result: 0
                            }
                        }

                        if (parseInt(orders[`${symbol}@${interval}@${id}`].result) === parseInt(orders[`${symbol}@${interval}@${id}`].number)) {
                            sockets[`${id}`].close()
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'long short', true)
                        } else {
                            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'long short', false, parseInt(orders[`${symbol}@${interval}@${id}`].result), parseInt(orders[`${symbol}@${interval}@${id}`].number))
                        }
                    }

                    if (macdCloseInput[`${symbol}@${interval}@${id}`]) {
                        macdCloseInput[`${symbol}@${interval}@${id}`].push(parseFloat(calcs[calcs.length - 1].histogram))
                    } else {
                        macdCloseInput[`${symbol}@${interval}@${id}`] = [parseFloat(calcs[calcs.length - 1].histogram)]
                    }

                } else {
                    if (!macdCloseInput[`${symbol}@${interval}@${id}`]){
                        macdInput[`${symbol}@${interval}@${id}`].values = close[`${symbol}@${interval}@${id}`].slice(0, -1);

                    }

                    if(close[`${symbol}@${interval}@${id}`].length === current_interval[`${symbol}@${interval}@${id}`]) {
                        close[`${symbol}@${interval}@${id}`].splice(-1);
                    }
                    close[`${symbol}@${interval}@${id}`].push(parseFloat(c))
                }
            } catch (e){
                console.error(e)
            }
        });

        sockets[`${id}`] = ws;
    } catch (e){
        console.error(e)
    }
}

async function createSocket({id, symbol, interval, number, type, type_g, test, user}) {
    if (interval) {
            try {
                console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'START MACD:', symbol, interval) // fapi.binance // testnet.binancefuture
                const response = await axios.get(`https://${test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/klines`, {
                    params: {
                        symbol: symbol,
                        interval: interval,
                        limit: 1000
                    }
                });

                close = {
                    ...close,
                    [`${symbol.toLowerCase()}@${interval}@${id}`]: response.data.map(kline => parseFloat(kline[4]))
                };

                macdInput[`${symbol.toLowerCase()}@${interval}@${id}`] = {
                    values: [],
                    fastPeriod: 12,
                    slowPeriod: 26,
                    signalPeriod: 9,
                    SimpleMAOscillator: false,
                    SimpleMASignal: false
                }

                current_interval = {
                    ...current_interval,
                    [`${symbol.toLowerCase()}@${interval}@${id}`]: response.data.length
                }

                addSocket(id, symbol.toLowerCase(), interval, number, type, type_g, test, user)

            } catch (e) {
                console.error(e)
            }
    }
}

exports.createSocket = createSocket