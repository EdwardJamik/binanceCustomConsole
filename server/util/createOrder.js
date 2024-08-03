const {getUserApi} = require("./getUserApi");
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const Order = require("../models/orders.model");
const User = require("../models/user.model");
const streamPrice = require('../webSocket/binance.price.socket')
const addwithoutLoss = require('../webSocket/binance.price.socket')
// const createSocket = require("../webSocket/binance.macd.socket");
const {cancelOrder} = require("./cancelOrder");
const {createEventsSocket} = require("../webSocket/binance.event.socket");
const {bot} = require("../bot");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const socketServer = require("../server");
const {getAvailableBalance} = require("./getBalance");
const {getMultiplePrices} = require('./getMultiplePrices')
const {getMultipleOrderDetails} = require('./getMultipleOrderDetails')
const {createTakeProfit} = require("./takeProfit");
const {roundDecimal} = require("./roundToFirstSign");
const {getWithoutLoss} = require("./getWithoutLoss");
const {getTrailingCH} = require("./getTrailingCH");
const addTrailing = require("../webSocket/binance.price.socket");

async function createOrder(orderElement, userData, id) {
    try {
        const {order} = orderElement;
        let currencySkeleton = [], multiplePrice = [],TAKE_PROFIT_MARKET

        console.log(order)

        let user
        let userId = id

        if(!userData){
            user = await User.findOne({_id: userId})
        } else {
            user = userData
        }

        const userApis = getUserApi(user)
        let key_1 = userApis?.key_1, key_2 = userApis?.key_2

        const side = order.positionSide === 'LONG' && order?.side === 'BUY' || order?.positionSide === 'SHORT' && order?.side === 'SELL' ? 'BUY' : 'SELL'

        if(Array.isArray(order?.symbol)){
            const findCurrency = user?.favorite?.filter(item => order?.symbol.includes(item.id)).reduce((acc, item) => acc.concat(item.list), []);

            if(findCurrency){
                if (side === 'BUY') {
                    multiplePrice = await getMultiplePrices(findCurrency,key_1,key_2,user?.binance_test).catch(error => console.error('Помилка:', error));

                    currencySkeleton = findCurrency?.map(pair => ({
                        symbol: pair,
                        positionSide: order?.positionSide,
                        side: order?.side,
                        quantity: roundDecimal((parseFloat(order?.quantity) * parseFloat(order?.leverage)) / parseFloat(multiplePrice[pair])),
                        type: 'MARKET'
                    }));

                } else if(side === 'SELL'){
                    const qty = order?.quantity

                    multiplePrice = await getMultiplePrices(findCurrency,key_1,key_2,user?.binance_test).catch(error => console.error('Помилка:', error));

                    currencySkeleton = findCurrency?.map(pair => ({
                        symbol: pair,
                        positionSide: order?.positionSide,
                        side: order?.side,
                        quantity: `${qty}`,
                        type: 'MARKET'
                    }));

                }
            }
        } else {
            if (side === 'BUY') {
                const qty = roundDecimal((parseFloat(order?.quantity) * parseFloat(order?.leverage)) / parseFloat(order?.currentPrice));

                TAKE_PROFIT_MARKET = createTakeProfit(order, {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: `${qty}`,
                    type: 'MARKET'
                }, user)

                currencySkeleton = [{
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: `${qty}`,
                    type: 'MARKET'
                },{...TAKE_PROFIT_MARKET}];
            } else if(side === 'SELL'){
                const qty = order?.quantity

                TAKE_PROFIT_MARKET = createTakeProfit(order, {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: `${qty}`,
                    type: 'MARKET'
                }, user)

                currencySkeleton = [{
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: `${qty}`,
                    type: 'MARKET'
                },{...TAKE_PROFIT_MARKET}];
            }
        }

        if (side === 'BUY' && currencySkeleton) {
            try {

                const headers = getHeaders(key_1)

                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE ORDER: ${JSON.stringify(currencySkeleton)}`)

                let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([...currencySkeleton]))}&timestamp=${Date.now()}`;
                const signatureBatch = getSignature(queryStringBatch, key_2)
                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                    headers,
                }).then(async (responseBatch) => {

                    createEventsSocket(user?.binance_test, key_1, key_2)

                    const TAKE_PROFIT_MARKET = responseBatch?.data?.find(order => order.type === 'TAKE_PROFIT_MARKET');
                    // const TRAILING_STOP_MARKET = responseBatch?.data?.find(order => order.type === 'TRAILING_STOP_MARKET');

                    getMultipleOrderDetails(responseBatch?.data, key_1, key_2, user?.binance_test).then(async (response) => {

                        // console.log(responseBatch?.data)
                        let ordersSystem = []

                        let i = 0
                        for (const position of response) {

                            if(position?.type !== 'TAKE_PROFIT_MARKET'){

                                if (order?.trailing?.status || order?.withoutLoss?.status || order?.macd?.status) {
                                    ordersSystem = createOrders(order, position, user, key_1, key_2, user?.binance_test)
                                }

                                const newPosition = await Order.create({
                                    positionsId: position?.orderId,
                                    startPrice: position?.avgPrice,
                                    commission: parseFloat(position.cumQuote) * parseFloat(order?.commission),
                                    leverage: order?.leverage,
                                    ordersId: {
                                        TRAILING_STOP_MARKET: ordersSystem?.trailing,
                                        TAKE_PROFIT_MARKET,
                                        macd: ordersSystem?.macd,
                                        withoutLoss: ordersSystem?.withoutLoss
                                    },
                                    positionData: position,
                                    userId: user?._id,
                                    openedConfig: {
                                        ...currencySkeleton[i],
                                        commission: parseFloat(order?.commission)
                                    },
                                    currency: position?.symbol,
                                    opened: true
                                });

                                streamPrice.streamPrice([position?.symbol], String(user?._id), user?.binance_test)

                                if (order?.withoutLoss?.status) {
                                    addwithoutLoss.addwithoutLoss(ordersSystem?.withoutLoss)
                                }

                                if (order?.trailing?.status) {
                                    addTrailing.addTrailing(ordersSystem?.trailing)
                                }

                                socketServer.socketServer.io.to(id).emit('updateOnePosition', {
                                    positionList: [{key: String(newPosition?._id), ...newPosition?._doc}],
                                });

                                socketServer.socketServer.io.to(id).emit('userMessage', {
                                    type: 'success',
                                    message: `Позиция успешно ${position?.symbol} создана`
                                });
                            }
                            i++
                        }

                        const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                        socketServer.socketServer.io.to(id).emit('userData', {
                            balance
                        });


                    }).catch((e) => {
                        console.log(e)
                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CREATE ORDER STEP 3: ${JSON.stringify(e?.response?.data)}`)
                        socketServer.socketServer.io.to(id).emit('userMessage', {
                            type: 'error',
                            message: `${e?.response?.data?.msg}`
                        });
                    })
                }).catch((e) => {
                    console.log(e)
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CREATE ORDER STEP 2: ${JSON.stringify(e?.response?.data)}`)

                    socketServer.socketServer.io.to(id).emit('userMessage', {
                        type: 'error',
                        message: `${e?.response?.data?.msg}`
                    });

                })
            } catch (e) {
                console.error(e)
            }
        } else if (side === 'SELL' && currencySkeleton) {
            try {

                const headers = getHeaders(key_1)

                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CANCELED ORDER ADMIN: ${JSON.stringify(currencySkeleton)}`)

                let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([...currencySkeleton]))}&timestamp=${Date.now()}`;
                const signatureBatch = getSignature(queryStringBatch, key_2)
                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                    headers,
                }).then(async (responseBatch) => {

                    if (responseBatch && !responseBatch?.data[0]?.msg) {

                        getMultipleOrderDetails(responseBatch?.data, key_1, key_2, user?.binance_test).then(async (response) => {

                            const updatedOrder = await Order.findOneAndUpdate({positionsId: order?.id}, {
                                    ClosePositionData: response[0],
                                    opened: false
                                },
                                {returnDocument: 'after'});

                            if (updatedOrder?.ordersId?.TAKE_PROFIT_MARKET || updatedOrder?.ordersId?.TRAILING_STOP_MARKET) {
                                cancelPositionOrder(responseBatch?.data[0]?.symbol, updatedOrder, user, key_1, key_2)
                            }

                            function priceDecimal(num,counter) {
                                let strNum = num.toString();
                                let dotIndex = strNum.indexOf('.');
                                if (dotIndex === -1 || dotIndex === strNum.length - 1) {
                                    return num;
                                } else {
                                    return String(strNum.slice(0, dotIndex + counter));
                                }
                            }

                            const startPrice = parseFloat(updatedOrder?.startPrice);
                            const closePrice = parseFloat(response[0]?.avgPrice);
                            const quantity = parseFloat(updatedOrder?.positionData?.origQty);
                            const cumQuantity = parseFloat(updatedOrder?.positionData?.cumQuote) || 0
                            const cumQuantityClose = updatedOrder?.ClosePositionData?.cumQuote ? parseFloat(updatedOrder?.ClosePositionData?.cumQuote) : parseFloat(updatedOrder?.ClosePositionData?.q) * parseFloat(updatedOrder?.ClosePositionData?.ap);

                            const openCommission = parseFloat(updatedOrder?.commission) || 0
                            const closeCommission = updatedOrder?.ClosePositionData?.cumQuote ? (parseFloat(updatedOrder?.ClosePositionData?.cumQuote) * parseFloat(updatedOrder?.openedConfig?.commission)) : ((parseFloat(updatedOrder?.ClosePositionData?.q) * parseFloat(updatedOrder?.ClosePositionData?.ap)) * parseFloat(updatedOrder?.openedConfig?.commission)) || 0

                            let percent = 0, profit = 0

                            if(updatedOrder?.openedConfig?.positionSide === 'SHORT'){
                                percent = priceDecimal((((startPrice - closePrice) / startPrice) * 100 * parseFloat(updatedOrder?.leverage) - (openCommission+closeCommission)),3);
                                profit = cumQuantity - cumQuantityClose
                            } else {
                                percent = priceDecimal((((closePrice - startPrice) / startPrice) * 100 * parseFloat(updatedOrder?.leverage) - (openCommission+closeCommission)),3);
                                profit = cumQuantityClose - cumQuantity
                            }

                            const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedOrder?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(response[0]?.origQty)}\n<b>Цена покупки:</b> ${parseFloat(updatedOrder?.startPrice).toFixed(3)}\n\n<b>Цена продажи:</b> ${parseFloat(response[0]?.avgPrice).toFixed(3)}\n<b>Сумма:</b> ${parseFloat(response[0]?.cumQuote).toFixed(3)}\n<b>Прибыль:</b> ${parseFloat(parseFloat(profit)-(parseFloat(openCommission)+parseFloat(closeCommission))).toFixed(6)} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedOrder?._id}</code>`

                            bot.telegram.sendMessage(user?.chat_id, message, {parse_mode: 'HTML'})

                            const orders = await Order.find({
                                userId: user?._id,
                                opened: true
                            }).sort({createdAt: -1})

                            const modifiedOrders = orders.map(order => {
                                const {_id, ...rest} = order.toObject();
                                return {key: _id, ...rest};
                            });

                            const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                            socketServer.socketServer.io.to(id).emit('userData', {
                                balance
                            });

                            socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                                positionList: modifiedOrders,
                            });

                            socketServer.socketServer.io.to(id).emit('userMessage', {
                                type: 'success',
                                message: `Позиция успешно закрыта`
                            });


                            // removeStreamPrice.removeStreamPrice(user?.token)
                        }).catch((e) => {
                            console.log(e)
                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${e}`)
                            socketServer.socketServer.io.to(id).emit('userMessage', {
                                type: 'error',
                                message: `Ошибка закрытия позиции: ${e?.response?.msg}`
                            });
                        })
                    } else {
                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2 (ORDER NOR CURRENTS): ${JSON.stringify(responseBatch?.data[0]?.msg)}`)


                        await Order.updateOne({_id: order?.id}, {
                            opened: false
                        });

                        const orders = await Order.find({
                            userId: user?._id,
                            opened: true
                        }).sort({createdAt: -1})

                        const ordersBefore = await Order.find({
                            userId: user?._id,
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

                        socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                            positionList: modifiedOrders,
                        });

                        socketServer.socketServer.io.to(id).emit('updatePositionBefore', {
                            positionList: modifiedBeforeOrders,
                        });

                        socketServer.socketServer.io.to(id).emit('userMessage', {
                            type: 'error',
                            message: `Ошибка закрытия позиции: ${responseBatch?.data[0]?.msg}`
                        });

                        // removeStreamPrice.removeStreamPrice(user?.token)
                    }
                }).catch(async (e) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2:`,e?.response)

                    socketServer.socketServer.io.to(id).emit('userMessage', {
                        type: 'error',
                        message: `Ошибка закрытия позиции: ${e?.response?.data?.msg}`
                    });
                })

            } catch (e) {
                console.error()
            }

        }
    } catch (e) {
        console.error(e)
    }
}

function createOrders(order,querySkeleton,user, key_1, key_2, binance_test){
    let queryElements = [], ordersId = {}

        // if (order?.macd?.status && !order?.withoutLoss?.status) {
        //     ordersId.macd = {...order?.macd}
        //     createSocket.createSocket({
        //         id: user?.token,
        //         symbol: order?.symbol,
        //         interval: `${order?.macd?.timeFrame}`,
        //         number: `${order?.macd?.number}`,
        //         type: order?.macd?.type,
        //         type_g: order?.macd?.type_g,
        //         test: user?.binance_test,
        //         user
        //     })
        // }

        if (order?.trailing?.status && order?.withoutLoss?.status) {
            ordersId = getWithoutLoss(order, user, querySkeleton,ordersId,key_1, key_2, binance_test)
            // console.log('WITHOUTLOSS --->>>',ordersId)
            ordersId = getTrailingCH({...order, currentPrice: ordersId?.withoutLoss?.fixedPrice}, user, querySkeleton, ordersId,key_1, key_2, binance_test)
            // console.log('TRAILING --->>>',ordersId)
        } else {
            if(order?.trailing?.status){
                ordersId = getTrailingCH(order, user, querySkeleton, ordersId, key_1, key_2, binance_test)
            } else if(order?.withoutLoss?.status){
                ordersId = getWithoutLoss(order, user, querySkeleton, ordersId, key_1, key_2, binance_test)
            }
        }

    console.log('ordersId->>>>>>>>>>>>',ordersId)

    return ordersId
}




async function cancelPositionOrder(symbol, data, user, key_1, key_2) {
    try {
        if (user) {
            const ordersId = Object.values(data?.ordersId);
            for (const currentOrder of ordersId) {

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
    } catch (error) {
        console.error(error)
        return null
    }
}

exports.createOrder = createOrder