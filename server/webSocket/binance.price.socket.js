const WebSocket = require('ws');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const socketServer = require("../server");
const Order = require('../models/orders.model')
const User = require('../models/user.model')
const {createOrder} = require("../util/createOrder");

let currency = {}
let user = {}

let withoutLoss = {}

let trailingCh =
    {
        // BTCUSDT:
        //     [{
        //         orderId: '1',
        //         userId: 'saf',
        //         q: 0,
        //         positionSide: 'LONG',
        //         symbol: 'BTCUSDT',
        //         price: 33400,
        //         deviation:33399,
        //         index:0,
        //         indexD:0,
        //         arrayPrice: [33400,33402,33404,33406,33408],
        //         arrayDeviation: [33399,33401,33403,33405,33407],
        //         lastPrice:0.5,
        //         lastDeviation:0.5,
        //         isPrecentPrice:true,
        //         isPrecentDeviation:true
        //     },{
        //         orderId: '1',
        //         userId: 'saf',
        //         q: 0,
        //         positionSide: 'SHORT',
        //         symbol: 'BTCUSDT',
        //         price: 33400,
        //         deviation: 33401,
        //         index: 0,
        //         indexD:0,
        //         arrayPrice: [33400,33398,33396,33394,33392],
        //         arrayDeviation: [33401,33399,33397,33395,33393],
        //         lastPrice:0.5,
        //         lastDeviation:0.5,
        //         isPrecentPrice:true,
        //         isPrecentDeviation:true
        //     }]
    }

function streamPrice(symbol,id,type_binance) {
    try{

        // function getRandomFloat(min, max) {
        //     return Math.random() * (max - min) + min;
        // }
        //
        //     // Початкові ціни для ETHUSDT та BTCUSDT (можна вибрати будь-яке початкове значення в заданому діапазоні)
        //     let ethPrice = getRandomFloat(2000.0, 3000.0);
        //     // let btcPrice = getRandomFloat(33390.0, 33410.0);
        //     let btcPrice = 33399.8
        //
        //     // Імітуємо коливання цін кілька разів
        //     setInterval(() => {
        //         // Генеруємо нові ціни для ETHUSDT та BTCUSDT
        //         let ethPriceChange = getRandomFloat(-1.2, 1.2); // Зміна ціни ETHUSDT в діапазоні від -5 до +5
        //         let btcPriceChange = getRandomFloat(-1.2, 1.2); // Зміна ціни BTCUSDT в діапазоні від -500 до +500
        //
        //         // Обновлюємо поточні ціни
        //         ethPrice += ethPriceChange;
        //         btcPrice += btcPriceChange;
        //
        //         // Виводимо поточні ціни, округлюючи до двох знаків після коми
        //         // console.log(`ETHUSDT price: ${ethPrice.toFixed(2)}, BTCUSDT price: ${btcPrice.toFixed(2)}`);
        //
        //         // wl('ETHUSDT',ethPrice)
        //         // wl('BTCUSDT',btcPrice)
        //         // ch('ETHUSDT',ethPrice)
        //         // ch('BTCUSDT',btcPrice)
        //
        //         // console.log('WL ->>>>>>>>>>',withoutLoss[s]?.length)
        //         if(withoutLoss['ETHUSDT']?.length || withoutLoss['BTCUSDT']?.length) {
        //             wl('ETHUSDT', parseFloat(ethPrice))
        //             wl('BTCUSDT', parseFloat(btcPrice))
        //         }
        //         // console.log('CH ->>>>>>>>>>',trailingCh[s]?.length)
        //         // if(trailingCh[s]?.length) {
        //         //     ch('ETHUSDT', parseFloat(ethPrice))
        //         //     ch('BTCUSDT', parseFloat(btcPrice))
        //         // }
        //     }, 500); // Інтервал у мілісекундах (тут кожну секунду)
        for(const curr of symbol)
        {
            if(!currency[curr] && !user[curr]){
                console.log("ADD PRICE STREAM")
                let ws = new WebSocket(`wss://${type_binance ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${curr.toLowerCase()}@trade`);

                ws.onopen = () => {
                    console.log('Open WEB SOCKET');

                    axios.get(`https://${type_binance ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/ticker/price?symbol=${curr.toLowerCase()}`).then((response) => {
                        const p = response.data.price;

                        socketServer.socketServer.io.emit('positionPrices', [`${curr}`,parseFloat(p)])
                    });

                        currency[curr] = ws

                    if(user[curr])
                        user[curr] = [...user[curr], id]
                    else
                        user[curr] = [id]
                };

                ws.onmessage = event => {
                    const {p,s} = JSON.parse(event.data)
                    if(user[s]) {
                        socketServer.socketServer.io.emit('positionPrices', [`${s}`, parseFloat(p)])


                        console.log('WL ->>>>>>>>>>',withoutLoss[s]?.length)
                        if(withoutLoss[s]?.length)
                            wl(s,parseFloat(p))
                        console.log('WL ->>>>>>>>>>',trailingCh[s]?.length)
                        if(trailingCh[s]?.length)
                            ch(s,parseFloat(p))
                    }

                };

                ws.onclose = () => {
                    console.log(`Close to server ${curr}`);
                    if(user[curr]) {
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
        console.log('WL START', symbol, price, withoutLoss[symbol]?.length)
        const currentPrice = parseFloat(price)
        const currentSymbol = symbol

        if (currentSymbol && currentPrice && withoutLoss[symbol]) {

            let index = 0;
            for (const order of withoutLoss[symbol]) {

                if (!order?.fix && !order?.fixDeviation && parseFloat(order?.fixedPrice) <= currentPrice && order?.positionSide === 'LONG' ||
                    !order?.fix && !order?.fixDeviation && parseFloat(order?.fixedPrice) >= currentPrice && order?.positionSide === 'SHORT') {

                    await fixedPosition(order, true)

                    withoutLoss[currentSymbol][index].fix = true;
                    if (order?.positionSide === 'LONG')
                        console.log(`LONG -> FIXED price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.fixedPrice) <= currentPrice, parseFloat(order?.fixedPrice), '<=', currentPrice);
                    else
                        console.log(`SHORT -> FIXED price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.fixedPrice) >= currentPrice, parseFloat(order?.fixedPrice), '>=', currentPrice);
                }

                if (order?.fix && !order?.fixDeviation && parseFloat(order?.minDeviation) >= currentPrice && order?.positionSide === 'LONG' ||
                    order?.fix && !order?.fixDeviation && parseFloat(order?.minDeviation) <= currentPrice && order?.positionSide === 'SHORT') {
                    // Якщо мінімальний поріг більше ніж ціна

                    await closePosition(order, true)

                    // const orderConf = {
                    //     symbol: currentSymbol,
                    //     positionSide: order?.positionSide,
                    //     side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                    //     quantity: order?.q,
                    //     type: 'MARKET',
                    //     id: String(order?.orderId)
                    // }
                    //
                    // createOrder({order: {orderConf}}, false, order?.userId)
                    withoutLoss[currentSymbol].splice(index, 1);

                    if (order?.positionSide === 'LONG')
                        console.log(`LONG -> CLOSE ORDER fixDeviation price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.minDeviation) >= currentPrice, parseFloat(order?.fixedPrice), '>=', currentPrice);
                    else
                        console.log(`SHORT -> CLOSE ORDER fixDeviation price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.minDeviation) <= currentPrice, parseFloat(order?.fixedPrice), '<=', currentPrice);

                }

                if (order?.fix && !order?.fixDeviation && parseFloat(order?.maxDeviation) <= currentPrice && order?.positionSide === 'LONG' ||
                    order?.fix && !order?.fixDeviation && parseFloat(order?.maxDeviation) >= currentPrice && order?.positionSide === 'SHORT') {
                    // Вимкнення мінімального порогу

                    await deviationFixedPosition(order, true)
                    withoutLoss[currentSymbol][index].fixDeviation = true;
                    // console.log(`fixDeviation ${order?.orderId}`, parseFloat(order?.maxDeviation) <= currentPrice, parseFloat(order?.maxDeviation), '<=', currentPrice);

                    if (order?.positionSide === 'LONG')
                        console.log(`LONG -> fixDeviation price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.maxDeviation) <= currentPrice, parseFloat(order?.maxDeviation), '<=', currentPrice);
                    else
                        console.log(`SHORT -> fixDeviation price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.maxDeviation) >= currentPrice, parseFloat(order?.maxDeviation), '>=', currentPrice);

                }

                if (order?.fix && order?.fixDeviation && parseFloat(order?.fixedPrice) >= currentPrice && order?.positionSide === 'LONG' ||
                    order?.fix && order?.fixDeviation && parseFloat(order?.fixedPrice) <= currentPrice && order?.positionSide === 'SHORT') {
                    // Якщо ціна фікс ціна більше ніж поточна ціна

                    // console.log(`CLOSE ORDER ${order?.orderId}`, parseFloat(order?.fixPrice) >= currentPrice, parseFloat(order?.fixPrice), '>=', currentPrice);

                    await closePosition(order, true)
                    // const orderConf = {
                    //     symbol: currentSymbol,
                    //     positionSide: order?.positionSide,
                    //     side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                    //     quantity: order?.q,
                    //     type: 'MARKET',
                    //     id: String(order?.orderId)
                    // }
                    //
                    // createOrder({order: {orderConf}}, false, order?.userId)
                    withoutLoss[currentSymbol].splice(index, 1);

                    if (order?.positionSide === 'LONG')
                        console.log(`LONG -> CLOSE ORDER price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.fixedPrice) >= currentPrice, parseFloat(order?.fixedPrice), '>=', currentPrice);
                    else
                        console.log(`SHORT -> CLOSE ORDER price: ${currentPrice} || ${order?.orderId}`, parseFloat(order?.fixedPrice) <= currentPrice, parseFloat(order?.fixedPrice), '<=', currentPrice);
                }

                index++;
            }
        }
        console.log('WL STOP', symbol, price)
    } catch (e) {
        console.error(e)
    }
}

async function ch(symbol, price) {
    try {
        const currentPrice = parseFloat(price)
        const currentSymbol = symbol

        if (currentSymbol && currentPrice && trailingCh[currentSymbol]) {
            console.log(`${symbol}: ${price.toFixed(4)}`);
            let index = 0;
            for (const order of trailingCh[currentSymbol]) {

                const chIndex = parseInt(trailingCh[currentSymbol][index]?.index)
                const chIndexD = parseInt(trailingCh[currentSymbol][index]?.indexD)

                if (parseFloat(order?.price) <= currentPrice && order?.positionSide === 'LONG' ||
                    parseFloat(order?.price) >= currentPrice && order?.positionSide === 'SHORT') {
                    // Перехід на новий рівень

                    console.log('OBJECT LEVEL')

                    if (trailingCh[currentSymbol][index]?.arrayPrice?.length - 1 >= chIndex + 1) {
                        trailingCh[currentSymbol][index].price = trailingCh[currentSymbol][index].arrayPrice[chIndex + 1];
                        trailingCh[currentSymbol][index].deviation = trailingCh[currentSymbol][index].arrayDeviation[chIndex === 0 ? 0 : chIndexD + 1];
                        trailingCh[currentSymbol][index].index = chIndex + 1
                        trailingCh[currentSymbol][index].indexD = chIndex === 0 ? 0 : chIndexD + 1

                        if (order?.positionSide === 'LONG')
                            console.log(`LONG -> NEXT LEVEL: ${currentPrice} || ${order?.orderId}`, trailingCh[currentSymbol][index].arrayPrice[chIndex + 1], trailingCh[currentSymbol][index].arrayDeviation[chIndex === 0 ? 0 : chIndexD + 1]);
                        else
                            console.log(`SHORT -> NEXT LEVEL: ${currentPrice} || ${order?.orderId}`, trailingCh[currentSymbol][index].arrayDeviation[chIndex + 1], trailingCh[currentSymbol][index].arrayDeviation[chIndex === 0 ? 0 : chIndexD + 1]);

                    } else {

                        console.log('ADDITIONAL LEVEL')
                        let newPrice = 0, newDeviation = 0

                        if (trailingCh[currentSymbol][index].isPrecentPrice) {
                            newPrice = parseFloat(trailingCh[currentSymbol][index].price) + (parseFloat(trailingCh[currentSymbol][index].price) * parseFloat(trailingCh[currentSymbol][index].lastPrice) / 100)
                            trailingCh[currentSymbol][index].price = newPrice;
                        } else {
                            newPrice = parseFloat(trailingCh[currentSymbol][index].price) + parseFloat(trailingCh[currentSymbol][index].lastPrice)
                            trailingCh[currentSymbol][index].price = newPrice;
                        }

                        if (trailingCh[currentSymbol][index].arrayDeviation?.length - 1 !== trailingCh[currentSymbol][index].indexD) {
                            trailingCh[currentSymbol][index].deviation = trailingCh[currentSymbol][index].arrayDeviation[chIndexD + 1];
                            trailingCh[currentSymbol][index].indexD = chIndexD + 1
                        } else {
                            if (trailingCh[currentSymbol][index].isPrecentDeviation) {
                                newDeviation = newPrice - (newPrice * parseFloat(trailingCh[currentSymbol][index].lastDeviation) / 100)
                                trailingCh[currentSymbol][index].deviation = newDeviation;
                            } else {
                                newDeviation = newPrice - parseFloat(trailingCh[currentSymbol][index].lastDeviation)
                                trailingCh[currentSymbol][index].deviation = newDeviation;
                            }
                        }

                        if (order?.positionSide === 'LONG')
                            console.log(`LONG -> NEXT LEVEL: ${currentPrice} || ${order?.orderId}`, newPrice, newDeviation);
                        else
                            console.log(`SHORT -> NEXT LEVEL: ${currentPrice} || ${order?.orderId}`, newPrice, newDeviation);
                    }
                }

                if ((parseFloat(order.deviation) >= currentPrice && order.positionSide === 'LONG') ||
                    (parseFloat(order.deviation) <= currentPrice && order.positionSide === 'SHORT')) {

                    const orderConf = {
                        symbol: currentSymbol,
                        positionSide: order?.positionSide,
                        side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                        quantity: order?.q,
                        type: 'MARKET',
                        id: String(order?.orderId)
                    }

                    await createOrder({order: {orderConf}}, false, order?.userId)
                    trailingCh[currentSymbol].splice(index, 1);
                    console.log(trailingCh[currentSymbol])

                    if (order.positionSide === 'LONG')
                        console.log(`LONG -> CLOSE ORDER price: ${currentPrice} || ${order.orderId}`, parseFloat(order.deviation) >= currentPrice, parseFloat(order.deviation), '>=', currentPrice);
                    else
                        console.log(`SHORT -> CLOSE ORDER price: ${currentPrice} || ${order.orderId}`, parseFloat(order.deviation) <= currentPrice, parseFloat(order.deviation), '<=', currentPrice);

                }

                index++;
            }
        }
    } catch (e) {
        console.error(e)
    }
}


// async function fixedWithouLoss(symbol,price,orders) {
//     try {
//
//         // const findOrder = await Order.find({
//         //     opened: true,
//         //     currency: symbol,
//         //     "ordersId.withoutLoss.status": true,
//         // })
//
//         for (const order of orders) {
//
//             if (order?.positionSide === 'LONG') {
//                 if (!order?.fix && parseFloat(order?.fixPrice) <= parseFloat(price)) {
//
//                     await Order.updateOne({
//                         _id: order?.orderId,
//                         opened: true,
//                         currency: symbol,
//                         "ordersId.withoutLoss.fixed": false,
//                     }, {
//                         "ordersId.withoutLoss.fixed": true
//                     });
//
//                     console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(order)}`)
//                     const user = await User.findOne({_id: order?.userId})
//
//                     const orders = await Order.find({
//                         userId: user?._id,
//                         opened: true
//                     }).sort({createdAt: -1})
//
//                     const modifiedOrders = orders.map(order => {
//                         const {_id, ...rest} = order.toObject();
//                         return {key: _id, ...rest};
//                     });
//
//                     socketServer.socketServer.io.to(user?.token).emit('updatePositionCreated', {
//                         positionList: modifiedOrders,
//                     });
//
//                 } else if (order?.fix && parseFloat(order?.fixPrice) > parseFloat(price)) {
//                     const user = await User.findOne({_id: order?.userId})
//
//                     await Order.updateOne({_id: order?.orderId}, {opened: false})
//
//                     const orderConf = {
//                         symbol: order?.symbol,
//                         positionSide: order?.positionSide,
//                         side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
//                         quantity: order?.quantity,
//                         type: 'MARKET',
//                         id: String(order?.orderId)
//                     }
//
//                     console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)
//                     await createOrder({order: {...orderConf}}, user, user?.token)
//                     // console.log('FIXED CLOSE')
//                 }
//             } else if (order?.openedConfig?.positionSide === 'SHORT') {
//                 if (!order?.fix && parseFloat(order?.fix) >= parseFloat(price)) {
//                     await Order.updateOne({
//                         _id: order?.orderId,
//                         opened: true,
//                         currency: symbol,
//                         "ordersId.withoutLoss.fixed": false,
//                     }, {
//                         "ordersId.withoutLoss.fixed": true
//                     });
//
//                     console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(order)}`)
//                     const user = await User.findOne({_id: order?.userId})
//
//                     const orders = await Order.find({
//                         userId: user?._id,
//                         opened: true
//                     }).sort({createdAt: -1})
//
//                     const modifiedOrders = orders.map(order => {
//                         const {_id, ...rest} = order.toObject();
//                         return {key: _id, ...rest};
//                     });
//
//                     socketServer.socketServer.io.to(user?.token).emit('updatePositionCreated', {
//                         positionList: modifiedOrders,
//                     });
//                 } else if (order?.ordersId?.withoutLoss?.fixed && parseFloat(order?.ordersId?.withoutLoss?.fixedPrice) < parseFloat(price)) {
//                     const user = await User.findOne({_id: order?.userId})
//                     await Order.updateOne({_id: order?._id}, {opened: false})
//
//                     const orderConf = {
//                         symbol: order?.openedConfig?.symbol,
//                         positionSide: order?.openedConfig?.positionSide,
//                         side: order?.openedConfig?.positionSide === 'LONG' ? 'SELL' : 'BUY',
//                         quantity: order?.openedConfig?.quantity,
//                         type: 'MARKET',
//                         id: String(order?._id)
//                     }
//                     console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)
//                     await createOrder({order: {...orderConf}}, user, user?.token)
//                 }
//             }
//         }
//     } catch (e) {
//         console.error(e)
//     }
// }

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

async function closePosition(order,type) {
    if(type) {
        const user = await User.findOne({_id: order?.userId})
        const orderConf = {
            symbol: order?.symbol,
            positionSide: order?.positionSide,
            side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
            quantity: order?.q,
            type: 'MARKET',
            id: String(order?.orderId)
        }
        createOrder({order: {...orderConf}}, user, user?.token)

        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)

        await Order.updateOne({
            positionsId: order?.orderId,
            userId: order?.userId,
            opened: true,
            currency: order?.symbol,
        }, {
            "ordersId.withoutLoss.closed": true,
            opened:false
        });

    } else {

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

        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(order)}`)

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