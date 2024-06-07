const {getHeaders, getSignature} = require("../util/signature");
const axios = require("axios");
const WebSocket = require('ws');
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env
const Order = require("../models/orders.model");
const User = require("../models/user.model");
const {getUserApi} = require("../util/getUserApi");
const {bot} = require('../bot/index')
let mainWs = ''
const socketServer = require("../server");

async function createEventsSocket(binance_test,key_1,key_2) {
    let listenKey = await createListenKey(binance_test,key_1,key_2);
    console.log(binance_test,key_1,key_2)
    try {
        const ws = new WebSocket(`wss://${binance_test ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${String(listenKey)}`);

        let intervalID;
        ws.on('open', async function open() {
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] START MONITORING ORDERS UPDATES`)
            intervalID = intervalID = setInterval(async () => {
                await createListenKey(binance_test, key_1, key_2);
            }, 3300000); //  3.300.000 = 55 minutes
            mainWs = ws
        });

        ws.on('close', async function close() {
            if (mainWs) {
                clearInterval(intervalID);
                listenKey = await createListenKey(binance_test, key_1, key_2);
                createEventsSocket(binance_test, key_1, key_2);
                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] REOPEN MONITORING ORDERS UPDATES`)
            } else {
                clearInterval(intervalID);
                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE MONITORING ORDERS UPDATES`)
            }
        });


        ws.on('message', async function incoming(data) {
            try {
                /*
                e - Event Type
                o:
                    s - Symbol
                    c - Client Order Id
                    S - Side
                    o - Order Type
                    x - Execution Type
                    X - Order Status
                    i - Order Id
                    ot - Original Order Type
                    ps - Position Side
                */
                const parsedData = JSON.parse(data);
                const {
                    e = null,
                    o: {
                        s = null,
                        c = null,
                        S = null,
                        o = null,
                        x = null,
                        X = null,
                        i = null,
                        ot = null,
                        R = null,
                        ps = null,
                        ap = null,
                        rp = null,
                        q = null,
                        sp = null
                    } = {}
                } = parsedData;

                // Can be event listenKeyExpired, foresee this!
                /*
                    All events:
                        CONDITIONAL_ORDER_TRIGGER_REJECT
                        GRID_UPDATE
                        STRATEGY_UPDATE
                        ACCOUNT_CONFIG_UPDATE
                        ORDER_TRADE_UPDATE - Will be done
                        ACCOUNT_UPDATE
                        MARGIN_CALL
                        listenKeyExpired - Will be done
                */
                // socketServer.socketServer.io.to(id).emit('userMessage', {
                //     type: 'success',
                //     message: `Позиция закрыта`
                // });

                // console.log(parsedData)


                if (e === 'ORDER_TRADE_UPDATE' && X === 'FILLED') {

                    const updatedPosition = await Order.findOneAndUpdate({"ordersId.TAKE_PROFIT_MARKET.orderId": i}, {
                            opened: false,
                            ClosePositionData: parsedData?.o,
                            "ordersId.TAKE_PROFIT_MARKET.closed": true
                        },
                        {returnDocument: 'after'})

                    if(ot === 'TAKE_PROFIT_MARKET' && R && updatedPosition && updatedPosition?.opened === false) {

                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] EVENTS TAKE_PROFIT_MARKET`, parsedData)
                            const findUser = await User.findOne({_id: updatedPosition?.userId})

                            cancelPositionOrder(s, updatedPosition, findUser)

                            socketServer.socketServer.io.to(findUser?.token).emit('userMessage', {
                                type: 'success',
                                message: `Позиция ${s} закрыта инструментом ${ot}`
                            });

                            const orders = await Order.find({
                                userId: updatedPosition?.userId,
                                opened: true
                            }).sort({createdAt: -1})

                            const ordersBefore = await Order.find({
                                userId: updatedPosition?.userId,
                                opened: false
                            }).sort({updatedAt: -1})

                            const modifiedOrders = orders.map(order => {
                                const {_id, ...rest} = order.toObject();
                                return {key: _id, ...rest};
                            });

                            const modifiedBeforeOrders = ordersBefore.map(order => {
                                const {_id, ...rest} = order.toObject();
                                return {key: _id, ...rest};
                            });

                            socketServer.socketServer.io.to(findUser?.token).emit('updatePositionCreated', {
                                positionList: modifiedOrders,
                            });

                            socketServer.socketServer.io.to(findUser?.token).emit('updatePositionBefore', {
                                positionList: modifiedBeforeOrders,
                            });

                            let percent = 0
                            const commission = parseFloat(updatedPosition?.commission) + ((parseFloat(q) * parseFloat(ap)) * parseFloat(updatedPosition?.openedConfig?.commission))
                            const profit = ((((parseFloat(q) * parseFloat(ap))) - parseFloat(updatedPosition?.positionData?.cumQuote)) - commission).toFixed(6)

                            if (ps === 'SHORT')
                                percent = ((((parseFloat(updatedPosition?.startPrice) - parseFloat(ap)) / parseFloat(updatedPosition?.startPrice))) * 100 * parseFloat(updatedPosition?.leverage) - (commission)).toFixed(2);
                            else
                                percent = ((((parseFloat(ap) - parseFloat(updatedPosition?.startPrice)) / parseFloat(updatedPosition?.startPrice))) * 100 * parseFloat(updatedPosition?.leverage) - (commission)).toFixed(2);

                            const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedPosition?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(q)}\n<b>Цена покупки:</b> ${parseFloat(updatedPosition?.startPrice).toFixed(2)}\n\n<b>Цена продажи:</b> ${parseFloat(ap).toFixed(2)}\n<b>Сумма:</b> ${(parseFloat(q) * parseFloat(ap)).toFixed(2)}\n<b>Прибыль:</b> ${profit} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedPosition?._id}</code>`
                            bot.telegram.sendMessage(findUser?.chat_id, message, {parse_mode: 'HTML'}).catch((e) => {
                                `[${new Date().toLocaleTimeString('uk-UA')}] ERROR SEND TELEGRAM`
                            })

                    }
                } else if(ot === 'TRAILING_STOP_MARKET' && R && updatedPosition && updatedPosition?.opened === false){
                    const updatedPosition = await Order.findOneAndUpdate({"ordersId.TRAILING_STOP_MARKET.orderId":i},{opened: false,ClosePositionData:parsedData?.o,"ordersId.TRAILING_STOP_MARKET.closed":true},
                        { returnDocument: 'after' })

                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] EVENTS TRAILING_STOP_MARKET`,parsedData)

                    const findUser = await User.findOne({_id:updatedPosition?.userId})

                    cancelPositionOrder(s, updatedPosition, findUser)

                    socketServer.socketServer.io.to(findUser?.token).emit('userMessage', {
                        type: 'success',
                        message: `Позиция ${s} закрыта инструментом ${ot}`
                    });

                    const orders = await Order.find({
                        userId: updatedPosition?.userId,
                        opened: true
                    }).sort({createdAt: -1})

                    const ordersBefore = await Order.find({
                        userId: updatedPosition?.userId,
                        opened: false
                    }).sort({updatedAt: -1})

                    const modifiedOrders = orders.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });

                    const modifiedBeforeOrders = ordersBefore.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });

                    socketServer.socketServer.io.to(findUser?.token).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });

                    socketServer.socketServer.io.to(findUser?.token).emit('updatePositionBefore', {
                        positionList: modifiedBeforeOrders,
                    });

                    let percent = 0
                    const commission = parseFloat(updatedPosition?.commission)+(parseFloat(response?.data?.cumQuote)*parseFloat(updatedPosition?.openedConfig?.commission))
                    const profit = ((((parseFloat(q) * parseFloat(ap))) - parseFloat(updatedPosition?.positionData?.cumQuote)) - commission).toFixed(6)

                    if(ps === 'SHORT')
                        percent = ((((parseFloat(updatedPosition?.startPrice)-parseFloat(ap)) / parseFloat(updatedPosition?.startPrice)))*100*parseFloat(updatedPosition?.leverage)-(commission)).toFixed(2);
                    else
                        percent = ((((parseFloat(ap)-parseFloat(updatedPosition?.startPrice)) / parseFloat(updatedPosition?.startPrice)))*100*parseFloat(updatedPosition?.leverage)-(commission)).toFixed(2);

                    const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedPosition?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(q)}\n<b>Цена покупки:</b> ${parseFloat(updatedPosition?.startPrice).toFixed(2)}\n\n<b>Цена продажи:</b> ${parseFloat(ap).toFixed(2)}\n<b>Сумма:</b> ${(parseFloat(q) * parseFloat(ap)).toFixed(2)}\n<b>Прибыль:</b> ${profit} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedPosition?._id}</code>`
                    bot.telegram.sendMessage(findUser?.chat_id, message, {parse_mode:'HTML'}).catch((e)=>{`[${new Date().toLocaleTimeString('uk-UA')}] ERROR SEND TELEGRAM`})
                } else{
                    // const parsedDatas = JSON.parse(data);
                    // console.log(parsedDatas?.o)
                    // let percent = 0
                    // const commission = parseFloat(updatedPosition?.commission)+(parseFloat(response?.data?.cumQuote)*parseFloat(updatedPosition?.openedConfig?.commission))
                    // const profit = ((((parseFloat(q) * parseFloat(ap))) - parseFloat(updatedPosition?.positionData?.cumQuote)) - commission).toFixed(6)
                    //
                    // if(ps === 'SHORT')
                    //     percent = ((((parseFloat(updatedPosition?.startPrice)-parseFloat(ap)) / parseFloat(updatedPosition?.startPrice)))*100*parseFloat(updatedPosition?.leverage)-(commission)).toFixed(2);
                    // else
                    //     percent = ((((parseFloat(ap)-parseFloat(updatedPosition?.startPrice)) / parseFloat(updatedOrder?.startPrice)))*100*parseFloat(updatedPosition?.leverage)-(commission)).toFixed(2);
                    //
                    // const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedPosition?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(q)}\n<b>Цена покупки:</b> ${parseFloat(updatedPosition?.startPrice).toFixed(2)}\n\n<b>Цена продажи:</b> ${parseFloat(ap).toFixed(2)}\n<b>Сумма:</b> ${(parseFloat(q) * parseFloat(ap)).toFixed(2)}\n<b>Прибыль:</b> ${profit} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedPosition?._id}</code>`
                    // bot.telegram.sendMessage(user?.chat_id, message, {parse_mode:'HTML'})
                }


            } catch (e) {
                console.error(`[${new Date().toLocaleTimeString('uk-UA')}] MONITORING ORDERS ERROR1:\n${e}`);
            }
        });

    } catch (e) {
        console.error(`[${new Date().toLocaleTimeString('uk-UA')}] MONITORING ORDERS ERROR2:\n${e}`);
    }
}

async function createListenKey(binance_test,key_1, key_2) {
    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE LISTEN KEY`)
    const headers = await getHeaders(key_1)

    try {
        const response = await axios.post(`https://${binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/listenKey`, null, {
            headers,
        });

        return response?.data?.listenKey;
    } catch(e){
        console.error(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE LISTEN KEY ERROR:\n${e}`);
        return null;
    }
}

async function cancelPositionOrder(symbol, data, user) {
    try {
        if (user) {
            const userApis = getUserApi(user)
            let key_1 = userApis?.key_1, key_2 = userApis?.key_2

            const ordersId = Object.values(data?.ordersId);
            for (const currentOrder of ordersId) {
                if(!currentOrder.closed) {
                    const timestamp = Date.now()
                    const signature = getSignature(`symbol=${symbol}&orderid=${currentOrder?.orderId}&timestamp=${timestamp}`, key_2)

                    const headers = getHeaders(key_1)

                    await axios.delete(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?symbol=${symbol}&orderid=${currentOrder?.orderId}&timestamp=${timestamp}&signature=${signature}`, {
                        headers: headers,
                    }).then((res) => {
                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CANCELED ORDERING: ${JSON.stringify(res?.data)}`)
                    }).catch((e) => {
                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ORDERING: ${JSON.stringify(e?.response?.data)}`)
                    });
                }
            }
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString('uk-UA')}] `,error)
        return null
    }
}

exports.createEventsSocket = createEventsSocket