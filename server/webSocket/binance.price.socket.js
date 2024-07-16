const WebSocket = require('ws');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const socketServer = require("../server");
const Order = require('../models/orders.model')
const User = require('../models/user.model')
const {createOrder} = require("../util/createOrder");
const {closePosition} = require("../util/closePosition");

let currency = {}
let user = {}

let withoutLoss = {}

let trailingCh = {}

function streamPrice(symbol,id,type_binance) {
    try{
        for(const curr of symbol)
        {
            if(!currency[curr] && !user[curr]){
                console.log("ADD PRICE STREAM")
                let ws = new WebSocket(`wss://${type_binance ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${curr.toLowerCase()}@trade`);

                ws.onopen = () => {
                    console.log('Open WEB SOCKET');

                    axios.get(`https://${type_binance ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v3/ticker/price?symbol=${curr.toLowerCase()}`).then((response) => {
                        const p = response.data.price;

                        socketServer.socketServer.io.emit('positionPrices', [`${curr}`, parseFloat(p)])
                    }).catch((e)=>{});

                    currency[curr] = ws

                    if (user[curr])
                        user[curr] = [...user[curr], id]
                    else
                        user[curr] = [id]
                };

                ws.onmessage = async event => {
                    const {p, s} = JSON.parse(event.data)
                    if (user[s]) {
                        await wl(s, parseFloat(p))
                        await ch(s, parseFloat(p))
                        socketServer.socketServer.io.emit('positionPrices', [`${s}`, parseFloat(p)])
                    }

                };

                ws.onclose = () => {
                    console.log(`Close to server ${curr}`);
                    if (user[curr]) {
                        ws = new WebSocket(`wss://fstream.binance.com/ws/${curr.toLowerCase()}@trade`);
                        currency[curr] = ws
                    }
                };

            } else{
                if(user[curr])
                    user[curr] = [...user[curr], id]
                else
                    user[curr] = [id]
            }
        }
    } catch (e){
        console.error(e)
    }
}

async function wl(symbol, price) {
    try {
        const currentPrice = parseFloat(price)
        const currentSymbol = symbol

        if (currentSymbol && currentPrice && withoutLoss[currentSymbol]) {

            let changed = false

            for (let index = 0; index < withoutLoss[currentSymbol].length; index++) {
                const order = withoutLoss[currentSymbol][index];

                if(order?.remove !== true) {
                    let precent = 0, profit = 0

                    if (order?.positionSide === 'LONG') {
                        precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                        profit = (((parseFloat(price) - parseFloat(order?.startPrice)) * parseFloat(order?.q))) - (precent + parseFloat(order?.commission))
                    } else {
                        precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                        profit = ((((parseFloat(order?.startPrice) - parseFloat(price)) * parseFloat(order?.q)) - (precent + parseFloat(order?.commission))))
                    }

                    console.log('PRICE -> ', price, 'PROFIT -> ', profit, " ID: ", order?.orderId)

                    if (profit) {
                        if (!order?.fix && !order?.fixDeviation && parseFloat(order?.fixedPrice) <= parseFloat(profit)) {

                            withoutLoss[currentSymbol][index].fix = true;
                            await fixedPosition(order, true)
                            console.log(`FIXED price: ${profit} || ${order?.orderId}`, parseFloat(order?.fixedPrice) >= profit, parseFloat(order?.fixedPrice), '>=', profit);
                            index++;
                        }

                        if (order?.fix && !order?.fixDeviation && parseFloat(order?.minDeviation) >= profit || order?.fix && order?.fixDeviation && parseFloat(order?.fixedPrice) >= profit) {
                            // Якщо мінімальний поріг більше ніж ціна

                            changed = true
                            withoutLoss[currentSymbol][index] = {...withoutLoss[currentSymbol][index], remove: true}

                            await closePosition({
                                    symbol: order?.symbol,
                                    positionSide: order?.positionSide,
                                    side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                                    quantity: order?.q,
                                    type: 'MARKET',
                                    id: order?.orderId
                            }, order?.userId, order?.key_1, order?.key_2, order?.binance_test)

                            await Order.updateOne({
                                positionsId: order?.orderId,
                                userId: order?.userId,
                            }, {
                                "ordersId.withoutLoss.closed": true
                            });

                            if(trailingCh[currentSymbol])
                                trailingCh[currentSymbol] = trailingCh[currentSymbol].filter(findOrder => findOrder.orderId !== order?.orderId);

                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify({
                                symbol: order?.symbol,
                                positionSide: order?.positionSide,
                                side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                                quantity: order?.q,
                                type: 'MARKET',
                                id: order?.orderId
                            })}`)

                            console.log(`CLOSE ORDER fixDeviation price: ${profit} || ${order?.orderId}`, parseFloat(order?.minDeviation) <= profit, parseFloat(order?.fixedPrice), '<=', profit);

                            index++
                        }

                        if (order?.fix && !order?.fixDeviation && parseFloat(order?.maxDeviation) <= profit) {
                            // Вимкнення мінімального порогу

                            withoutLoss[currentSymbol][index].fixDeviation = true;
                            await deviationFixedPosition(order, true)
                            console.log(`fixDeviation price: ${profit} || ${order?.orderId}`, parseFloat(order?.maxDeviation) >= profit, parseFloat(order?.maxDeviation), '>=', profit);
                            index++;
                        }

                    } else {
                        index++;
                    }
                } else {
                    index++;
                }

                if(index === (withoutLoss[currentSymbol]?.length-1) && changed){
                    withoutLoss[currentSymbol] = withoutLoss[currentSymbol].filter(order => order?.remove !== true);
                    console.log(`REMOVED ITEM WITHOUTLOSS ${currentSymbol}-> `, withoutLoss[currentSymbol])
                }
            }
        }
    } catch (e) {
        console.error(e)
    }
}

async function ch(symbol, price) {
    try {
        const currentPrice = parseFloat(price)
        const currentSymbol = symbol

        if (currentSymbol && currentPrice && trailingCh[currentSymbol]) {

            let changed = false

            for (let index = 0; index < trailingCh[currentSymbol].length; index++) {
                const order = trailingCh[currentSymbol][index];

                if (order?.remove !== true) {
                    const chIndex = parseInt(trailingCh[currentSymbol][index]?.index)

                    let precent = 0, profit = 0

                    if (order?.positionSide === 'LONG') {
                        precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                        profit = (((parseFloat(price) - parseFloat(order?.startPrice)) * parseFloat(order?.q))) - (precent + parseFloat(order?.commission))
                    } else {
                        precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                        profit = ((((parseFloat(order?.startPrice) - parseFloat(price)) * parseFloat(order?.q)) - (precent + parseFloat(order?.commission))))
                    }

                    if (parseFloat(order?.price) <= profit) {
                        // Перехід на новий рівень
                        if(trailingCh[currentSymbol][index]?.fix !== true)
                            trailingCh[currentSymbol][index] = {...trailingCh[currentSymbol][index], fix:true}

                        if (trailingCh[currentSymbol][index]?.arrayPrice?.length - 1 >= chIndex + 1) {
                            trailingCh[currentSymbol][index].price = trailingCh[currentSymbol][index].arrayPrice[chIndex + 1];
                            trailingCh[currentSymbol][index].deviation = trailingCh[currentSymbol][index].arrayDeviation[chIndex + 1];
                            trailingCh[currentSymbol][index].index = chIndex + 1

                            await fixedPosition(trailingCh[currentSymbol][index], false)

                            console.log(`TRAILING CH -> NEXT LEVEL: ${currentPrice} -> profit: ${profit} || ID: ${order?.orderId}`, trailingCh[currentSymbol][index].arrayDeviation[chIndex + 1], trailingCh[currentSymbol][index].arrayDeviation[chIndex + 1]);

                        } else {
                            const lastArrayPriceIndex = trailingCh[currentSymbol][index]?.arrayPrice?.length - 1
                            const newPrice = parseFloat(trailingCh[currentSymbol][index]?.lastPrice) + parseFloat(trailingCh[currentSymbol][index]?.arrayPrice[lastArrayPriceIndex])
                            const newDeviation = parseFloat(newPrice) - (parseFloat(trailingCh[currentSymbol][index]?.lastPrice) * parseFloat(parseFloat(trailingCh[currentSymbol][index]?.lastDeviation)) / 100)

                            trailingCh[currentSymbol][index].arrayPrice = [...trailingCh[currentSymbol][index].arrayPrice, newPrice]
                            trailingCh[currentSymbol][index].arrayDeviation = [...trailingCh[currentSymbol][index].arrayDeviation, newDeviation]
                            trailingCh[currentSymbol][index].price = parseFloat(newPrice);
                            trailingCh[currentSymbol][index].deviation = parseFloat(newDeviation);
                            trailingCh[currentSymbol][index].index = chIndex + 1

                            await fixedPosition(trailingCh[currentSymbol][index], false)

                            console.log(`TRAILING CH ADDITIONAL NEXT LEVEL: ${currentPrice} -> profit: ${profit}  || ID: ${order?.orderId} NEW ITERATION: ${chIndex + 1}`, newPrice, newDeviation);
                        }

                        index++
                    } else if(order?.fix && parseFloat(order.deviation) >= profit) {

                        changed = true
                        trailingCh[currentSymbol][index] = {...trailingCh[currentSymbol][index], remove: true}

                        await closePosition({
                                symbol: order?.symbol,
                                positionSide: order?.positionSide,
                                side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                                quantity: order?.q,
                                type: 'MARKET',
                                id: order?.orderId
                        }, order?.userId, order?.key_1, order?.key_2, order?.binance_test)

                        if(withoutLoss[currentSymbol])
                            withoutLoss[currentSymbol] = withoutLoss[currentSymbol].filter(findOrder => findOrder.orderId !== order?.orderId);
                        // await fixedPosition(trailingCh[currentSymbol][index], false)

                        await Order.updateOne({
                            positionsId: order?.orderId,
                            userId: order?.userId,
                        }, {
                            "ordersId.TRAILING_STOP_MARKET.closed": true
                        });

                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE TRAILING CH ORDER price: ${currentPrice} || -> profit: ${profit} -> CLOSE ${order?.orderId} ${JSON.stringify({
                            symbol: order?.symbol,
                            positionSide: order?.positionSide,
                            side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                            quantity: order?.q,
                            type: 'MARKET',
                            id: order?.orderId
                        })}`)

                        console.log(`CLOSE TRAILING CH ORDER price: ${currentPrice} || -> profit: ${profit}  ${order.orderId}`, parseFloat(order.deviation) <= profit, parseFloat(order.deviation), '<=', profit);

                        index++;
                    }
                } else {
                    index++
                }

                if(index === (trailingCh[currentSymbol]?.length-1) && changed){
                    trailingCh[currentSymbol] = trailingCh[currentSymbol].filter(order => order?.remove !== true);
                    console.log(`REMOVED ITEM TRAILING CH ${currentSymbol}-> `, trailingCh[currentSymbol])
                }
            }
        }
    } catch (e) {
        console.error(e)
    }
}

function addwithoutLoss(settings){
    if(withoutLoss[settings?.symbol]){
        withoutLoss[settings?.symbol].push({...settings})
    } else {
        withoutLoss = {
            [settings?.symbol]:[
                {...settings}
            ],
            ...withoutLoss
        }
    }
}

function addTrailing(settings){
    if(trailingCh[settings?.symbol]){
        trailingCh[settings?.symbol].push({...settings})
    } else {
        trailingCh = {
            [settings?.symbol]:[
                {...settings}
            ],
            ...trailingCh
        }
    }
}

async function removeInstrument(type, orderId, symbol, id, userId) {

    if (type === 'withoutLoss') {
        if(withoutLoss[symbol]) {
            await Order.updateOne({
                _id: id,
                opened: true,
                currency: symbol
            }, {
                "ordersId.withoutLoss": {}
            });

            withoutLoss[symbol] = withoutLoss[symbol].filter(order => order?.orderId !== orderId);

            const orders = await Order.find({
                userId: userId,
                opened: true
            }).sort({createdAt: -1})

            const modifiedOrders = orders?.map(order => {
                const {_id, ...rest} = order.toObject();
                return {key: _id, ...rest};
            });

            socketServer.socketServer.io.to(String(userId)).emit('updatePositionCreated', {
                positionList: modifiedOrders,
            });
        }
    } else if (type === 'trailing') {
        if(trailingCh[symbol]) {
            await Order.updateOne({
                _id: id,
                opened: true,
                currency: symbol
            }, {
                "ordersId.TRAILING_STOP_MARKET": {}
            });
            trailingCh[symbol] = trailingCh[symbol].filter(order => order?.orderId !== orderId);

            const orders = await Order.find({
                userId: userId,
                opened: true
            }).sort({createdAt: -1})

            const modifiedOrders = orders?.map(order => {
                const {_id, ...rest} = order.toObject();
                return {key: _id, ...rest};
            });

            socketServer.socketServer.io.to(String(userId)).emit('updatePositionCreated', {
                positionList: modifiedOrders,
            });
        }
    }


}

async function deviationFixedPosition(order,type) {
    if(type){
        await Order.updateOne({
            positionsId: order?.orderId,
            userId: order?.userId,
            opened: true,
            currency: order?.symbol,
            "ordersId.withoutLoss.fixDeviation": false,
        }, {
            "ordersId.withoutLoss.fixDeviation": true
        });

        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] DEVIATION FIXED POSITION: ${JSON.stringify(order)}`)

        const orders = await Order.find({
            userId: order?.userId,
            opened: true
        }).sort({createdAt: -1})

        const modifiedOrders = orders.map(order => {
            const {_id, ...rest} = order.toObject();
            return {key: _id, ...rest};
        });

        socketServer.socketServer.io.to(order?.userId).emit('updatePositionCreated', {
            positionList: modifiedOrders,
        });
    } else {

    }
}
async function fixedPosition(order,type) {
    if(type){
        await Order.updateOne({
            positionsId: order?.orderId,
            userId: order?.userId,
            opened: true,
            currency: order?.symbol,
            "ordersId.withoutLoss.fix": false,
        }, {
            "ordersId.withoutLoss.fixed": true,
            "ordersId.withoutLoss.fix": true
        });

        const orders = await Order.find({
            userId: order?.userId,
            opened: true
        }).sort({createdAt: -1})

        const modifiedOrders = orders?.map(order => {
            const {_id, ...rest} = order.toObject();
            return {key: _id, ...rest};
        });

        socketServer.socketServer.io.to(String(order?.userId)).emit('updatePositionCreated', {
            positionList: modifiedOrders,
        });

    } else {
        await Order.updateOne({
            positionsId: order?.orderId,
            userId: order?.userId,
            opened: true,
            currency: order?.symbol,
        }, {
            "ordersId.TRAILING_STOP_MARKET": {...order, fix:true}
        });

        const orders = await Order.find({
            userId: order?.userId,
            opened: true
        }).sort({createdAt: -1})

        const modifiedOrders = orders?.map(order => {
            const {_id, ...rest} = order.toObject();
            return {key: _id, ...rest};
        });

        socketServer.socketServer.io.to(String(order?.userId)).emit('updatePositionCreated', {
            positionList: modifiedOrders,
        });
    }
}

async function removeStreamPrice(id) {
    function removeValueFromArray(array, value) {
        const index = array.indexOf(value);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

     for (const array of Object.values(user)) {
         await removeValueFromArray(array, id);
     }

    for (let key in currency) {
        if (user[key].length === 0) {
            await currency[key].close()
            delete currency[key]
            delete user[key]
        }
    }
}


exports.streamPrice = streamPrice
exports.removeStreamPrice = removeStreamPrice
exports.addwithoutLoss = addwithoutLoss
exports.addTrailing = addTrailing
exports.removeInstrument = removeInstrument