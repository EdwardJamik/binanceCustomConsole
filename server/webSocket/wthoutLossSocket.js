const axios = require('axios')
const {MACD} = require("technicalindicators");
const WebSocket = require('ws');
const Order = require('../models/orders.model')
const {createOrder} = require("../util/createOrder");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env

let allowTrade = {},
    sockets = {},
    current_interval = []

async function addSocket(id, orderId, symbol, fixedPrice,test,io) {
    try{
        console.log(id, orderId, symbol, fixedPrice,test,io)
        const ws = new WebSocket(`wss://${test ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${symbol.toLowerCase()}@trade`);
        // fstream.binance // fstream.binancefuture
        ws.on('open', function open() {
            console.log(orderId)
            allowTrade[`${symbol}@${id}`] = true
            console.log(`connected: ${id}`);
        });

        ws.on('close', async function close() {
            console.log(`disconnected: ${id}`);
            if (allowTrade[`${symbol}@${id}`]) {
                console.log(`RECONNECT: ${id}`);
                addSocket(id, orderId, symbol, fixedPrice,test,io)
            } else {
                //CLOSE ORDER
                const findOrder = await Order.findOne({positionsId: orderId})
                const order = {...findOrder?.openedConfig, side: 'SELL'}
                createOrder({order}, io, orderId)
                console.log(`DISCONNECT: ${id}`);
                delete sockets[`${id}`]
                delete current_interval[`${symbol}@${interval}@${id}`]
                delete allowTrade[`${symbol}@${interval}@${id}`]
            }
        });

        ws.on('message', function incoming(data) {
            try {
                let {p,s} = JSON.parse(data);



            } catch (e){
                console.error(e)
            }
        });

        sockets[`${id}`] = ws;
    } catch (e){
        console.error(e)
    }
}

async function createSocketWithoutLoss({id, orderId, symbol, fixedPrice, test, io}) {
    if (id) {
        try {
            console.log(`${new Date().toLocaleTimeString('uk-UA')}`,'START WithoutLoss:', symbol, orderId) // fapi.binance // testnet.binancefuture

            current_interval = {
                ...current_interval,
                [`${symbol.toLowerCase()}@${id}`]: fixedPrice
            }

            addSocket(id, orderId, symbol.toLowerCase(), fixedPrice,test,io)

        } catch (e) {
            console.error(e)
        }
    }
}

exports.createSocketWithoutLoss = createSocketWithoutLoss