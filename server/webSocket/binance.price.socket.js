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
        for(const curr of symbol)
        {
            if(!currency[curr] && !user[curr]){
                console.log("ADD PRICE STREAM")
                let ws = new WebSocket(`wss://${type_binance ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${curr.toLowerCase()}@trade`);

                ws.onopen = () => {
                    console.log('Open WEB SOCKET');

                    axios.get(`https://${type_binance ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v3/ticker/price?symbol=${curr.toLowerCase()}`).then((response) => {
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
                        wl(s, parseFloat(p))
                        ch(s, parseFloat(p))
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
        const currentPrice = parseFloat(price)
        const currentSymbol = symbol

        if (currentSymbol && currentPrice && withoutLoss[symbol]) {

            let index = 0;
            for (const order of withoutLoss[symbol]) {

                let precent = 0, profit = 0
                if (order?.positionSide === 'LONG') {
                    precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                    profit = (((parseFloat(price) - parseFloat(order?.startPrice)) * parseFloat(order?.q))) - (precent + parseFloat(order?.commission))
                } else {
                    precent = parseFloat(order?.q) * parseFloat(price) * parseFloat(order?.commissionPrecent)
                    profit = ((((parseFloat(order?.startPrice) - parseFloat(price)) * parseFloat(order?.q)) - (precent + parseFloat(order?.commission))))
                }

                console.log('PRICE -> ', price ,'PROFIT -> ', profit ," ID: ",order?.orderId)

                if(profit){
                    if (!order?.fix && !order?.fixDeviation && parseFloat(order?.fixedPrice) <= parseFloat(profit)) {

                        await fixedPosition(order, true)
                        withoutLoss[currentSymbol][index].fix = true;
                        console.log(`FIXED price: ${profit} || ${order?.orderId}`, parseFloat(order?.fixedPrice) >= profit, parseFloat(order?.fixedPrice), '>=', profit);
                    }

                    if (order?.fix && !order?.fixDeviation && parseFloat(order?.minDeviation) >= profit) {
                        // Якщо мінімальний поріг більше ніж ціна

                        withoutLoss[currentSymbol].splice(index, 1);

                        const orderConf = {
                            symbol: order?.symbol,
                            positionSide: order?.positionSide,
                            side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                            quantity: order?.q,
                            type: 'MARKET',
                            id: order?.orderId
                        }

                        await createOrder({order: {...orderConf}}, user, order?.userId)

                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)

                        await Order.updateOne({
                            positionsId: order?.orderId,
                            userId: order?.userId,
                        }, {
                            "ordersId.withoutLoss.closed": true
                        });

                            console.log(`CLOSE ORDER fixDeviation price: ${profit} || ${order?.orderId}`, parseFloat(order?.minDeviation) <= profit, parseFloat(order?.fixedPrice), '<=', profit);

                    }

                    if (order?.fix && !order?.fixDeviation && parseFloat(order?.maxDeviation) <= profit) {
                        // Вимкнення мінімального порогу

                        await deviationFixedPosition(order, true)
                        withoutLoss[currentSymbol][index].fixDeviation = true;
                        console.log(`fixDeviation price: ${profit} || ${order?.orderId}`, parseFloat(order?.maxDeviation) >= profit, parseFloat(order?.maxDeviation), '>=', profit);

                    }

                    if (order?.fix && order?.fixDeviation && parseFloat(order?.fixedPrice) >= profit) {
                        // Якщо ціна фікс ціна більше ніж поточна ціна

                        withoutLoss[currentSymbol].splice(index, 1);
                        const orderConf = {
                            symbol: order?.symbol,
                            positionSide: order?.positionSide,
                            side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                            quantity: order?.q,
                            type: 'MARKET',
                            id: order?.orderId
                        }

                        await createOrder({order: {...orderConf}}, user, order?.userId)

                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)

                        await Order.updateOne({
                            positionsId: order?.orderId,
                            userId: order?.userId,
                        }, {
                            "ordersId.withoutLoss.closed": true
                        });

                        console.log(`CLOSE ORDER price: ${profit} || ${order?.orderId}`, parseFloat(order?.fixedPrice) <= profit, parseFloat(order?.fixedPrice), '<=', profit);
                    }
                }

                index++;
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

                    // await createOrder({order: {orderConf}}, false, order?.userId)
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
        const orderConf = {
            symbol: order?.symbol,
            positionSide: order?.positionSide,
            side: order?.positionSide === 'LONG' ? 'SELL' : 'BUY',
            quantity: order?.q,
            type: 'MARKET',
            id: order?.orderId
        }

        const user = await User.findOne({_id: order?.userId})

        createOrder({order: {...orderConf}}, user, order?.userId)

        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`,'USER: ',user)

        await Order.updateOne({
            positionsId: order?.orderId,
            userId: order?.userId,
        }, {
            "ordersId.withoutLoss.closed": true
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

        const modifiedOrders = orders?.map(order => {
            const {_id, ...rest} = order.toObject();
            return {key: _id, ...rest};
        });

        socketServer.socketServer.io.to(String(order?.userId)).emit('updatePositionCreated', {
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