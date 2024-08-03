const WebSocket = require('ws');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const socketServer = require("../server");
const Order = require('../models/orders.model')
const User = require('../models/user.model')
const {createOrder} = require("../util/createOrder");
const {closePosition} = require("../util/closePosition");
const logUserEvent = require("../util/logger");

let currency = {}
let user = {}
let queue = {}
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
        const currentPrice = parseFloat(price);
        const currentSymbol = symbol;

        if (!currentSymbol || !currentPrice || !withoutLoss[currentSymbol]) return;

        const updatedOrders = await Promise.all(withoutLoss[currentSymbol].map(async (order) => {
            if (order?.remove) return order;

            const { positionSide, q, commissionPrecent, startPrice, commission, fixedPrice, fix, fixDeviation, minDeviation, maxDeviation, orderId, trailing } = order;

            const precent = parseFloat(q) * currentPrice * parseFloat(commissionPrecent);
            const profit = positionSide === 'LONG'
                ? ((currentPrice - parseFloat(startPrice)) * parseFloat(q)) - (precent + parseFloat(commission))
                : ((parseFloat(startPrice) - currentPrice) * parseFloat(q)) - (precent + parseFloat(commission));

            if (!profit) return order;

            if (!fix && !fixDeviation && parseFloat(fixedPrice) <= profit) {
                await fixedPosition(order, true);
                logUserEvent(`${order?.orderId}`, `FIXED БУ: ${order?.symbol}, current price: ${currentPrice}, fixedPrice:${fixedPrice}, profit: ${profit}`);

                if(order?.trailing){
                    return { ...order, fix: true, remove: true };
                } else {
                    return { ...order, fix: true};
                }

            }

            if ((fix && !fixDeviation && parseFloat(minDeviation) >= profit) ||
                (fix && fixDeviation && parseFloat(fixedPrice) >= profit)) {

                const index = queue[currentSymbol].findIndex(item => item.orderId === orderId);

                if (index !== -1 && index === 0) {
                    await closePosition({
                        symbol: order.symbol,
                        positionSide,
                        side: positionSide === 'LONG' ? 'SELL' : 'BUY',
                        quantity: q,
                        type: 'MARKET',
                        id: orderId
                    }, order.userId, order.key_1, order.key_2, order.binance_test);

                    await Order.updateOne(
                        {positionsId: orderId, userId: order.userId},
                        {"ordersId.withoutLoss.closed": true}
                    );

                    if (trailingCh[currentSymbol]) {
                        trailingCh[currentSymbol] = trailingCh[currentSymbol].filter(findOrder => findOrder.orderId !== orderId);
                    }

                    queue[currentSymbol] = queue[currentSymbol].filter(findItem => findItem.orderId !== orderId);

                    logUserEvent(`${order?.orderId}`, `БУ Close ORDER: current price: ${currentPrice}, fixedPrice:${fixedPrice}, profit: ${profit}`);

                    return {...order, remove: true};
                } else {
                    logUserEvent(`${order?.orderId}`, `БУ NOT close order, waiting list : current price: ${currentPrice}, fixedPrice:${fixedPrice}, profit: ${profit}`);
                }
            }

            if (fix && !fixDeviation && parseFloat(maxDeviation) <= profit) {
                await deviationFixedPosition(order, true);
                logUserEvent(`${order?.orderId}`, `FIXED DEVIATION БУ: ${order?.symbol}, current price: ${currentPrice}, maxDeviationPrice:${maxDeviation}, profit: ${profit}`);
                return { ...order, fixDeviation: true };
            }

            return order;
        }));

        withoutLoss[currentSymbol] = updatedOrders.filter(order => !order.remove);

    } catch (e) {
        console.error(e);
    }
}

async function ch(symbol, price) {
    try {
        const currentPrice = parseFloat(price);
        const currentSymbol = symbol;

        if (!currentSymbol || !currentPrice || !trailingCh[currentSymbol]) return;

        const updatedOrders = await Promise.all(trailingCh[currentSymbol].map(async (order) => {
            if (order?.remove) return order;

            const { positionSide, q, commissionPrecent, startPrice, commission, price: orderPrice, deviation, fix, arrayPrice, arrayDeviation, lastPrice, lastDeviation, orderId } = order;
            const chIndex = parseInt(order?.index);
            const dIndex = parseInt(order?.dIndex);

            const precent = parseFloat(q) * currentPrice * parseFloat(commissionPrecent);
            const profit = positionSide === 'LONG'
                ? ((currentPrice - parseFloat(startPrice)) * parseFloat(q)) - (precent + parseFloat(commission))
                : ((parseFloat(startPrice) - currentPrice) * parseFloat(q)) - (precent + parseFloat(commission));

            if (parseFloat(orderPrice) <= profit) {
                let updatedOrder = { ...order, fix: true };

                if (arrayPrice.length - 1 >= chIndex + 1) {
                    logUserEvent(`${orderId}`, `FIXED CH AND NEXT STEP: ${order?.symbol}, current price: ${currentPrice}, current CH Price:${arrayPrice[chIndex]}, current CH Deviation: ${arrayDeviation[dIndex]}, next Step Price:${arrayPrice[chIndex + 1]}, next Step Deviation:${chIndex === 0 ? arrayDeviation[dIndex] : arrayDeviation[dIndex + 1]}`);

                    updatedOrder = {
                        ...updatedOrder,
                        price: arrayPrice[chIndex + 1],
                        deviation: chIndex === 0 ? arrayDeviation[dIndex] : arrayDeviation[dIndex + 1],
                        index: chIndex + 1,
                        dIndex: dIndex + 1
                    };

                } else {
                    const lastArrayPriceIndex = arrayPrice.length - 1;
                    const newPrice = parseFloat(lastPrice) + parseFloat(arrayPrice[lastArrayPriceIndex]);
                    const newDeviation = newPrice - (parseFloat(lastPrice) * parseFloat(lastDeviation) / 100);

                    logUserEvent(`${orderId}`, `FIXED CH AND NEXT STEP: ${order?.symbol}, current price: ${currentPrice}, current CH Price:${arrayPrice[chIndex]}, current CH Deviation: ${arrayDeviation[dIndex]}, next Step Price:${newPrice}, next Step Deviation:${newDeviation}`);

                    updatedOrder = {
                        ...updatedOrder,
                        arrayPrice: [...arrayPrice, newPrice],
                        arrayDeviation: [...arrayDeviation, newDeviation],
                        price: newPrice,
                        deviation: newDeviation,
                        index: chIndex + 1,
                        dIndex: dIndex + 1
                    };
                }


                await fixedPosition(updatedOrder, false);
                return updatedOrder;

            } else if (fix && parseFloat(deviation) >= profit) {

                const index = queue[order?.symbol].findIndex(item => item.orderId === orderId);

                if(index !== -1 && index === 0)
                {
                    await closePosition({
                        symbol: order.symbol,
                        positionSide,
                        side: positionSide === 'LONG' ? 'SELL' : 'BUY',
                        quantity: q,
                        type: 'MARKET',
                        id: orderId
                    }, order.userId, order.key_1, order.key_2, order.binance_test);

                    if (withoutLoss[currentSymbol]) {
                        withoutLoss[currentSymbol] = withoutLoss[currentSymbol].filter(findOrder => findOrder.orderId !== orderId);
                    }

                    await Order.updateOne(
                        { positionsId: orderId, userId: order.userId },
                        { "ordersId.TRAILING_STOP_MARKET.closed": true }
                    );

                    queue[currentSymbol] = queue[currentSymbol].filter(findItem => findItem.orderId !== orderId);

                    logUserEvent(`${order?.orderId}`, `CH Close ORDER: ${order?.symbol}, current price: ${currentPrice}, currentCHPrice:${arrayPrice[chIndex]}, currentCHDeviation: ${arrayDeviation[dIndex]}`);

                    return { ...order, remove: true };
                } else {
                    logUserEvent(`${order?.orderId}`, `CH NOT close order, waiting list : ${order?.symbol}, current price: ${currentPrice}, currentCHPrice:${arrayPrice[chIndex]}, currentCHDeviation: ${arrayDeviation[dIndex]}`);
                }
            }

            return order;
        }));

        trailingCh[currentSymbol] = updatedOrders.filter(order => !order.remove);

    } catch (e) {
        console.error(e);
    }
}

function addwithoutLoss(settings){
    if (queue[settings?.symbol]) {
        const existingIndex = queue[settings?.symbol].findIndex(item => item.orderId === settings?.orderId);
        if (existingIndex !== -1) {
            if (parseFloat(settings?.allPrice) > queue[settings?.symbol][existingIndex].price) {
                queue[settings?.symbol][existingIndex].price = parseFloat(settings?.fixedPrice);
            }
        } else {
            queue[settings?.symbol].push({orderId: settings?.orderId, price: parseFloat(settings?.fixedPrice)});
        }
    } else {
        queue = {
            [settings?.symbol]: [
                {orderId: settings?.orderId, price: parseFloat(settings?.fixedPrice)}
            ],
            ...queue
        };
    }

    queue[settings?.symbol].sort((a, b) => a.price - b.price);

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

    console.log(withoutLoss[settings?.symbol])
    console.log(queue)
}

async function removeQueue(id,symbol){
    const existingIndex = queue[symbol].findIndex(item => item.orderId === id);
    if (existingIndex !== -1) {
        queue[symbol] = queue[symbol].filter(findItem => findItem.orderId !== id);
    }

    queue[symbol].sort((a, b) => a.price - b.price);

    console.log(queue)

    return;
}

function addTrailing(settings){
    if (queue[settings?.symbol]) {
        const existingIndex = queue[settings?.symbol].findIndex(item => item.orderId === settings?.orderId);
        if (existingIndex !== -1) {
            if (parseFloat(settings?.allPrice) > queue[settings?.symbol][existingIndex].price) {
                queue[settings?.symbol][existingIndex].price = parseFloat(settings?.allPrice);
            }
        } else {
            queue[settings?.symbol].push({orderId: settings?.orderId, price: parseFloat(settings?.allPrice)});
        }
    } else {
        queue = {
            [settings?.symbol]: [
                {orderId: settings?.orderId, price: parseFloat(settings?.allPrice)}
            ],
            ...queue
        };
    }

    queue[settings?.symbol].sort((a, b) => a.price - b.price);

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

    console.log(trailingCh[settings?.symbol])
    console.log(queue)

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
exports.removeQueue = removeQueue