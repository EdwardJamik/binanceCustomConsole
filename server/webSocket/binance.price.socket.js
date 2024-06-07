const WebSocket = require('ws');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const socketServer = require("../server");
const Order = require('../models/orders.model')
const User = require('../models/user.model')
const {getAvailableBalance} = require("../util/getBalance");
const {createOrder} = require("../util/createOrder");

let currency = {}
let user = {}

async function streamPrice(symbol,id,type_binance) {
    try{
        console.log("ADD PRICE STREAM")
        for(const curr of symbol)
        {
            if(!currency[curr] && !user[curr]){
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
                        fixedWithouLoss(s,parseFloat(p))
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

async function fixedWithouLoss(symbol,price) {
    try {

        const findOrder = await Order.find({
            opened: true,
            currency: symbol,
            "ordersId.withoutLoss.status": true,
        })

        for (const order of findOrder) {

            if (order?.openedConfig?.positionSide === 'LONG') {
                if (!order?.ordersId?.withoutLoss?.fixed && parseFloat(order?.ordersId?.withoutLoss?.fixedPrice) <= parseFloat(price)) {

                    await Order.findOneAndUpdate({
                        _id: order?._id,
                        opened: true,
                        currency: symbol,
                        "ordersId.withoutLoss.fixed": false,
                    }, {
                        "ordersId.withoutLoss.fixed": true
                    }, {returnDocument: 'after'});

                    const user = await User.findOne({_id: order?.userId})
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(order)}`)
                    const orders = await Order.find({
                        userId: user?._id,
                        opened: true
                    }).sort({createdAt: -1})

                    const modifiedOrders = orders.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });

                    socketServer.socketServer.io.to(user?.token).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });
                    // console.log('FIXED')
                } else if (order?.ordersId?.withoutLoss?.fixed && parseFloat(order?.ordersId?.withoutLoss?.fixedPrice) > parseFloat(price)) {
                    const user = await User.findOne({_id: order?.userId})

                    await Order.updateOne({_id: order?._id}, {opened: false})

                    const orderConf = {
                        symbol: order?.openedConfig?.symbol,
                        positionSide: order?.openedConfig?.positionSide,
                        side: order?.openedConfig?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                        quantity: order?.openedConfig?.quantity,
                        type: 'MARKET',
                        id: String(order?._id)
                    }

                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)
                    await createOrder({order: {...orderConf}}, user, user?.token)
                    // console.log('FIXED CLOSE')
                }
            } else if (order?.openedConfig?.positionSide === 'SHORT') {
                if (!order?.ordersId?.withoutLoss?.fixed && parseFloat(order?.ordersId?.withoutLoss?.fixedPrice) >= parseFloat(price)) {
                    await Order.findOneAndUpdate({
                        _id: order?._id,
                        opened: true,
                        currency: symbol,
                        "ordersId.withoutLoss.fixed": false,
                    }, {
                        "ordersId.withoutLoss.fixed": true
                    }, {returnDocument: 'after'});

                    const user = await User.findOne({_id: order?.userId})
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(order)}`)
                    const orders = await Order.find({
                        userId: user?._id,
                        opened: true
                    }).sort({createdAt: -1})

                    const modifiedOrders = orders.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });

                    socketServer.socketServer.io.to(user?.token).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });
                } else if (order?.ordersId?.withoutLoss?.fixed && parseFloat(order?.ordersId?.withoutLoss?.fixedPrice) < parseFloat(price)) {
                    const user = await User.findOne({_id: order?.userId})
                    await Order.updateOne({_id: order?._id}, {opened: false})

                    const orderConf = {
                        symbol: order?.openedConfig?.symbol,
                        positionSide: order?.openedConfig?.positionSide,
                        side: order?.openedConfig?.positionSide === 'LONG' ? 'SELL' : 'BUY',
                        quantity: order?.openedConfig?.quantity,
                        type: 'MARKET',
                        id: String(order?._id)
                    }
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(orderConf)}`)
                    await createOrder({order: {...orderConf}}, user, user?.token)
                }
            }
        }
    } catch (e) {
        console.error(e)
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

// module.exports = {streamPrice,removeStreamPrice}