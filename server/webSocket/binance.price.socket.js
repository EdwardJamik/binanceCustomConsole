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

function streamPrice(symbol,id,type_binance) {
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
        const findOrder = await Order.findOneAndUpdate({
            opened: true,
            currency: symbol,
            "ordersId.withoutLoss.fixedPrice": {$gt: price},
            "ordersId.withoutLoss.fixed": false
        }, {
            "ordersId.withoutLoss.fixed": true
        }, {returnDocument: 'after'});

        const findCloseOrder = await Order.findOneAndUpdate({
            opened: true,
            currency: symbol,
            "ordersId.withoutLoss.fixedPrice": {$lt: price},
            "ordersId.withoutLoss.fixed": true
        }, {
            "ordersId.withoutLoss.fixed": true
        }, {returnDocument: 'after'});

        if (findOrder) {
            const user = await User.findOne({_id: findOrder?.userId})
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] FIXED POSITION: ${JSON.stringify(findOrder)}`)
            const orders = await Order.find({
                userId: user?._id,
                opened: true
            }).sort({createdAt: -1})

            const modifiedOrders = orders.map(order => {
                const {_id, ...rest} = order.toObject();
                return {key: _id, ...rest};
            });

            socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                positionList: modifiedOrders,
            });
        } else if (findCloseOrder) {
            const user = await User.findOne({_id: findCloseOrder?.userId})
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE FIXED POSITION: ${JSON.stringify(findCloseOrder)}`)
            const order = {
                ...findCloseOrder?.openedConfig,
                side: findCloseOrder?.openedConfig?.positionSide === 'LONG' ? 'SELL' : 'BUY'
            }
            createOrder(order, user, user?.token)
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


module.exports = {streamPrice,removeStreamPrice}