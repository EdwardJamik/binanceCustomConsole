const {getUserApi} = require("./getUserApi");
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const Order = require("../models/orders.model");
const User = require("../models/user.model");
const {streamPrice, setStremPriceSocket} = require("../webSocket/binance.price.socket");
const createSocket = require("../webSocket/binance.macd.socket");
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

async function createOrder(orderElement, userData, id) {
    try {
        const {order} = orderElement;
        let currencySkeleton = [], multiplePrice = [],TAKE_PROFIT_MARKET

        console.log(order)

        let user
        let userId = id

        if(!userData){
            user = await User.findOne({token:userId})
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
                        quantity: qty,
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
                    quantity: qty,
                    type: 'MARKET'
                }, user)

                currencySkeleton = [{
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                },{...TAKE_PROFIT_MARKET}];
            } else if(side === 'SELL'){
                const qty = order?.quantity

                TAKE_PROFIT_MARKET = createTakeProfit(order, {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                }, user)

                currencySkeleton = [{
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
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

                        let ordersSystem = []
                        if (order?.trailing?.status || order?.withoutLoss?.status || order?.macd?.status) {
                            ordersSystem = createOrders(order, response, user)
                        }

                        let i = 0
                        for (const position of response) {

                            if(position?.type !== 'TAKE_PROFIT_MARKET'){
                                const newPosition = await Order.create({
                                    positionsId: position?.orderId,
                                    startPrice: position?.avgPrice,
                                    commission: parseFloat(position.cumQuote) * parseFloat(order?.commission),
                                    leverage: order?.leverage,
                                    ordersId: {
                                        TRAILING_STOP_MARKET: ordersSystem?.trailing,
                                        TAKE_PROFIT_MARKET,
                                        macd: ordersSystem?.ordersId?.macd,
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

                        streamPrice(currencySkeleton, user?.token, user?.binance_test)

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

                            const updatedOrder = await Order.findOneAndUpdate({_id: order?.id}, {
                                    ClosePositionData: response[0],
                                    opened: false
                                },
                                {returnDocument: 'after'});

                            if (updatedOrder?.ordersId?.TAKE_PROFIT_MARKET || updatedOrder?.ordersId?.TRAILING_STOP_MARKET) {
                                cancelPositionOrder(responseBatch?.data[0]?.symbol, updatedOrder, user, key_1, key_2)
                            }

                            let percent = 0
                            const commission = parseFloat(updatedOrder?.commission) + (parseFloat(response[0]?.cumQuote) * parseFloat(updatedOrder?.openedConfig?.commission))
                            const profit = ((parseFloat(response[0]?.cumQuote) - parseFloat(updatedOrder?.positionData?.cumQuote)) - commission).toFixed(6)

                            if (response[0]?.positionSide === 'SHORT')
                                percent = ((((parseFloat(updatedOrder?.startPrice) - parseFloat(response[0]?.avgPrice)) / parseFloat(updatedOrder?.startPrice))) * 100 * parseFloat(updatedOrder?.leverage) - (commission)).toFixed(3);
                            else
                                percent = ((((parseFloat(response[0]?.avgPrice) - parseFloat(updatedOrder?.startPrice)) / parseFloat(updatedOrder?.startPrice))) * 100 * parseFloat(updatedOrder?.leverage) - (commission)).toFixed(3);

                            const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedOrder?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(response[0]?.origQty)}\n<b>Цена покупки:</b> ${parseFloat(updatedOrder?.startPrice).toFixed(3)}\n\n<b>Цена продажи:</b> ${parseFloat(response[0]?.avgPrice).toFixed(3)}\n<b>Сумма:</b> ${parseFloat(response[0]?.cumQuote).toFixed(3)}\n<b>Прибыль:</b> ${profit} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedOrder?._id}</code>`

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
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${JSON.stringify(e?.response)}`)

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

function createOrders(order,querySkeleton,user){
    let queryElements = [], ordersId = {}

    console.log(order,querySkeleton)
    for(const position of querySkeleton) {
        if (order?.macd?.status && !order?.withoutLoss?.status) {
            ordersId.macd = {...order?.macd}
            createSocket.createSocket({
                id: user?.token,
                symbol: order?.symbol,
                interval: `${order?.macd?.timeFrame}`,
                number: `${order?.macd?.number}`,
                type: order?.macd?.type,
                type_g: order?.macd?.type_g,
                test: user?.binance_test,
                user
            })
        }

        if (order?.trailing?.status && order?.withoutLoss?.status) {

        } else {
            if(order?.trailing?.status){

            } else if(order?.withoutLoss?.status){
                ordersId = getWithoutLoss(order, user, position)
            }
        }
    }



    console.log(ordersId)

    // if (order?.trailing?.status || order?.withoutLoss?.status) {
    //
    //     if(!order?.withoutLoss?.status && order?.trailing?.status){
    //         let trailingStopMarketQuery = {...querySkeleton};
    //         trailingStopMarketQuery.side = querySkeleton.positionSide === 'LONG' ? 'SELL' : 'BUY';
    //
    //         trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
    //
    //         if (order?.trailing?.percent) {
    //             trailingStopMarketQuery.callbackRate = `${(order?.trailing?.stopPrice).toFixed(2)}`;
    //         } else {
    //             let result = (((parseFloat(order?.trailing?.stopPrice)/((parseFloat(order?.quantity)/parseFloat(order?.trailing?.currentPrice))*parseFloat(order?.leverage)))+parseFloat(order?.trailing?.currentPrice))-parseFloat(order?.trailing?.currentPrice))
    //
    //             let str = result.toString();
    //             let index = str.indexOf(".");
    //             let finalPercentResult = parseFloat(str.slice(0, index + 2));
    //             trailingStopMarketQuery.callbackRate = `${finalPercentResult}`;
    //         }
    //
    //         queryElements.push(trailingStopMarketQuery);
    //     }
    //     else if(order?.withoutLoss?.status && order?.trailing?.status){
    //
    //         const cross = order?.withoutLoss?.percent && order?.withoutLoss?.status ? ((parseFloat(order?.withoutLoss?.currentPrice) * parseFloat(order?.withoutLoss?.stopPrice))/100) : parseFloat(order?.withoutLoss?.stopPrice)
    //         const fee = ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice)*(parseFloat(order?.withoutLoss?.commission)*2))
    //
    //         if(order?.positionSide === 'SHORT'){
    //
    //             const withousLossShort = ((
    //                         ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //                         -
    //                         (parseFloat(cross)+parseFloat(fee))
    //                     )
    //                     *
    //                     parseFloat(order?.withoutLoss?.currentPrice)
    //                 )
    //                 /
    //                 ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //
    //             ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossShort}}
    //
    //             if(order?.trailing?.status) {
    //                 createTrailing(withousLossShort)
    //             }
    //
    //             console.log('withousLossShort',withousLossShort)
    //
    //         } else{
    //
    //             console.log('withousLossLong')
    //             const withousLossLong = ((
    //                         ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //                         +
    //                         (parseFloat(cross)+parseFloat(fee))
    //                     )
    //                     *
    //                     parseFloat(order?.withoutLoss?.currentPrice)
    //                 )
    //                 /
    //                 ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //
    //
    //             console.log('withousLossLONG',withousLossLong)
    //
    //             ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossLong}}
    //
    //             if(order?.trailing?.status) {
    //                 createTrailing(withousLossLong)
    //             }
    //
    //
    //         }
    //
    //
    //     } else if(order?.withoutLoss?.status){
    //         const cross = order?.withoutLoss?.percent && order?.withoutLoss?.status ? ((parseFloat(order?.withoutLoss?.currentPrice) * parseFloat(order?.withoutLoss?.stopPrice))/100) : parseFloat(order?.withoutLoss?.stopPrice)
    //         const fee = ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice)*(parseFloat(order?.withoutLoss?.commission)*2))
    //
    //         if(order?.positionSide === 'SHORT'){
    //
    //             const withousLossShort = ((
    //                         ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //                         -
    //                         (parseFloat(cross)+parseFloat(fee))
    //                     )
    //                     *
    //                     parseFloat(order?.withoutLoss?.currentPrice)
    //                 )
    //                 /
    //                 ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //
    //             ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossShort}}
    //
    //             console.log('withousLossShort',withousLossShort)
    //
    //         } else{
    //
    //             console.log('withousLossLong')
    //             const withousLossLong = ((
    //                         ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //                         +
    //                         (parseFloat(cross)+parseFloat(fee))
    //                     )
    //                     *
    //                     parseFloat(order?.withoutLoss?.currentPrice)
    //                 )
    //                 /
    //                 ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
    //
    //
    //             console.log('withousLossLONG',withousLossLong)
    //
    //             ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossLong}}
    //
    //         }
    //     }

        // function createTrailing(activationPrice){
        //     console.log(activationPrice)
        //     let trailingStopMarketQuery = {...querySkeleton};
        //     trailingStopMarketQuery.side = querySkeleton.positionSide === 'LONG' ? 'SELL' : 'BUY'; // IDK what should be in trailing
        //
        //     trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
        //     if (order?.trailing?.percent) {
        //         trailingStopMarketQuery.callbackRate = `${(order?.trailing?.stopPrice).toFixed(2)}`;
        //         trailingStopMarketQuery.activatePrice = `${activationPrice}`
        //     } else {
        //         trailingStopMarketQuery.callbackRate = `${((order?.trailing?.stopPrice / order?.trailing?.currentPrice) * 100).toFixed(2)}`;
        //         trailingStopMarketQuery.activatePrice = `${activationPrice}`
        //     }
        //
        //     console.log(trailingStopMarketQuery)
        //     queryElements.push(trailingStopMarketQuery);
        // }
    // }

    return ordersId

    // return {queryElements, ordersId}
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