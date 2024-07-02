const {getUserApi} = require("./getUserApi");
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const Order = require("../models/orders.model");
const User = require("../models/user.model");
const streamPrice = require('../webSocket/binance.price.socket.js')
const removeStreamPrice = require('../webSocket/binance.price.socket.js')
const createSocket = require("../webSocket/binance.macd.socket");
const {cancelOrder} = require("./cancelOrder");
const {createEventsSocket} = require("../webSocket/binance.event.socket");
const {bot} = require("../bot");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const socketServer = require("../server");
const {getAvailableBalance} = require("./getBalance");

async function createOrder(orderElement, userData, id) {
    try {
        const {order} = orderElement;
        // console.log(order)
        // return false

        const side = order.positionSide === 'LONG' && order?.side === 'BUY' || order?.positionSide === 'SHORT' && order?.side === 'SELL' ? 'BUY' : 'SELL'

        let user
        let userId = id

        // if(!userData){
        //     user = await User.findOne({_id:userId})
        // } else {
        //     user = {...userData}
        // }


        function roundToFirstSignificantDecimal(number) {
            let integerPart = Math.trunc(number);

            let fractionalPart = number - integerPart;

            if (fractionalPart !== 0 && integerPart === 0) {
                let factor = 1;
                while (fractionalPart * factor < 1) {
                    factor *= 10;
                }
                fractionalPart = Math.ceil(fractionalPart * factor) / factor;
            }

            if (integerPart === 0)
                return `${integerPart + fractionalPart}`;
            else
                return `${integerPart}`;

        }

        if (side === 'BUY') {
            try {
                const qty = roundToFirstSignificantDecimal((parseFloat(order?.quantity) * parseFloat(order?.leverage)) / parseFloat(order?.currentPrice));

                let querySkeleton = {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                };

                // const userApis = getUserApi(user)
                // let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                // createEventsSocket(user?.binance_test, key_1, key_2)

                // const headers = getHeaders(key_1)

                try {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE ORDER: ${JSON.stringify(querySkeleton)}`)

                    const orderPos = await createOrders(order, querySkeleton, user)
                     return  false
                    let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([{...querySkeleton}, ...orderPos?.queryElements]))}&timestamp=${Date.now()}`;
                    const signatureBatch = getSignature(queryStringBatch, key_2)
                    axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                        headers,
                    }).then(async (responseBatch) => {

                        const TAKE_PROFIT_MARKET = responseBatch?.data?.find(order => order.type === 'TAKE_PROFIT_MARKET');
                        const TRAILING_STOP_MARKET = responseBatch?.data?.find(order => order.type === 'TRAILING_STOP_MARKET');

                        let queryStringCheck = `symbol=${responseBatch?.data[0].symbol}&orderId=${responseBatch?.data[0].orderId}&timestamp=${Date.now()}`;
                        const signatureCheck = getSignature(queryStringCheck, key_2)

                        axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryStringCheck}&signature=${signatureCheck}`, {
                            headers: headers,
                        }).then(async (response) => {

                            await Order.insertMany({
                                positionsId: responseBatch?.data[0].orderId,
                                startPrice: response.data.avgPrice,
                                commission: parseFloat(response.data.cumQuote) * parseFloat(order?.commission),
                                leverage: order?.leverage,
                                ordersId: {
                                    TRAILING_STOP_MARKET,
                                    TAKE_PROFIT_MARKET,
                                    macd: orderPos?.ordersId?.macd,
                                    withoutLoss: orderPos?.ordersId?.withoutLoss
                                },
                                positionData: response.data,
                                userId,
                                openedConfig: {
                                    ...querySkeleton,
                                    quantity: qty,
                                    commission: parseFloat(order?.commission)
                                },
                                currency: order?.symbol,
                                opened: true
                            });

                            const sybmols = await Order.distinct('currency', {userId: user?._id, opened: true})

                            streamPrice.streamPrice(sybmols, user?.token, user?.binance_test)

                            const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                            socketServer.socketServer.io.to(id).emit('userData', {
                                balance
                            });

                            socketServer.socketServer.io.to(id).emit('userMessage', {
                                type: 'success',
                                message: `Позиция успешно создана`
                            });
                            const orders = await Order.find({
                                userId: user?._id,
                                opened: true
                            }).sort({createdAt: -1})
                            const modifiedOrders = orders.map(order => {
                                const {_id, ...rest} = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                                return {key: _id, ...rest};
                            });
                            socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                                positionList: modifiedOrders,
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
            } catch (e) {
                console.error(e)
            }
        } else if (side === 'SELL') {
            try {

                const qty = order?.quantity
                let querySkeleton = {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                };

                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                const headers = getHeaders(userApis?.key_1)

                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CANCELED ORDER ADMIN: ${JSON.stringify(querySkeleton)}`)

                let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([querySkeleton]))}&timestamp=${Date.now()}`;
                const signatureBatch = getSignature(queryStringBatch, key_2)
                console.log('CLOSE SKELETON: ',querySkeleton)
                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                    headers,
                }).then(async (responseBatch) => {

                    if (responseBatch && !responseBatch?.data[0]?.msg) {

                        let queryStringCheck = `symbol=${responseBatch?.data[0].symbol}&orderId=${responseBatch?.data[0].orderId}&timestamp=${Date.now()}`;
                        const signatureCheck = getSignature(queryStringCheck, key_2)


                        axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryStringCheck}&signature=${signatureCheck}`, {
                            headers: headers,
                        }).then(async (response) => {

                            const updatedOrder = await Order.findOneAndUpdate({_id: order?.id}, {
                                    ClosePositionData: response?.data,
                                    opened: false
                                },
                                {returnDocument: 'after'});

                            if (updatedOrder?.ordersId?.TAKE_PROFIT_MARKET || updatedOrder?.ordersId?.TRAILING_STOP_MARKET) {
                                cancelPositionOrder(responseBatch?.data[0]?.symbol, updatedOrder, user, key_1, key_2)
                            }


                            let percent = 0
                            const commission = parseFloat(updatedOrder?.commission) + (parseFloat(response?.data?.cumQuote) * parseFloat(updatedOrder?.openedConfig?.commission))
                            const profit = ((parseFloat(response?.data?.cumQuote) - parseFloat(updatedOrder?.positionData?.cumQuote)) - commission).toFixed(6)

                            if (response?.data?.positionSide === 'SHORT')
                                percent = ((((parseFloat(updatedOrder?.startPrice) - parseFloat(response?.data?.avgPrice)) / parseFloat(updatedOrder?.startPrice))) * 100 * parseFloat(updatedOrder?.leverage) - (commission)).toFixed(2);
                            else
                                percent = ((((parseFloat(response?.data?.avgPrice) - parseFloat(updatedOrder?.startPrice)) / parseFloat(updatedOrder?.startPrice))) * 100 * parseFloat(updatedOrder?.leverage) - (commission)).toFixed(2);

                            const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedOrder?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(response?.data?.origQty)}\n<b>Цена покупки:</b> ${parseFloat(updatedOrder?.startPrice).toFixed(2)}\n\n<b>Цена продажи:</b> ${parseFloat(response?.data?.avgPrice).toFixed(2)}\n<b>Сумма:</b> ${parseFloat(response?.data?.cumQuote).toFixed(2)}\n<b>Прибыль:</b> ${profit} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedOrder?._id}</code>`
                            bot.telegram.sendMessage(user?.chat_id, message, {parse_mode: 'HTML'})

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
                                const {_id, ...rest} = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                                return {key: _id, ...rest};
                            });

                            const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                            socketServer.socketServer.io.to(id).emit('userData', {
                                balance
                            });

                            socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                                positionList: modifiedOrders,
                            });

                            socketServer.socketServer.io.to(id).emit('updatePositionBefore', {
                                positionList: modifiedBeforeOrders,
                            });

                            socketServer.socketServer.io.to(id).emit('userMessage', {
                                type: 'success',
                                message: `Позиция успешно закрыта`
                            });


                            removeStreamPrice.removeStreamPrice(user?.token)
                        }).catch((e) => {
                            console.log(e)
                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${e}`)
                            socketServer.socketServer.io.to(id).emit('userMessage', {
                                type: 'error',
                                message: `Ошибка закрытия позиции: ${e?.response?.data?.msg}`
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

                        removeStreamPrice.removeStreamPrice(user?.token)
                    }
                }).catch(async (e) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${JSON.stringify(e?.response?.data)}`)

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

function createOrders(order,querySkeleton, user){
    let queryElements = [], ordersId = {}

    if (order?.take_profit?.status) {
        let takeProfitQuery = {...querySkeleton};
        takeProfitQuery.side = order?.positionSide === 'LONG' ? 'SELL' :  'BUY';

        takeProfitQuery.type = `TAKE_PROFIT_MARKET`;
        if (order?.take_profit?.percent) {
            const percentPrice = (order?.take_profit?.currentPrice * order?.take_profit?.stopPrice) / 100;
            if (order?.positionSide === 'LONG') {
                takeProfitQuery.stopPrice = `${(Number(order?.take_profit?.currentPrice) + percentPrice).toFixed(2)}`;
            } else if (order?.positionSide === 'SHORT') {
                takeProfitQuery.stopPrice = `${(order?.take_profit?.currentPrice - percentPrice).toFixed(2)}`;
            }
        } else {

            if (order?.positionSide === 'LONG') {
                takeProfitQuery.stopPrice = `${((parseFloat(order?.take_profit?.stopPrice)/(parseFloat(order?.quantity)/parseFloat(order?.take_profit?.currentPrice)))+parseFloat(order?.take_profit?.currentPrice)).toFixed(2)}`;
            } else if (order?.positionSide === 'SHORT') {
                takeProfitQuery.stopPrice = `${(parseFloat(order?.take_profit?.currentPrice)-(parseFloat(order?.take_profit?.stopPrice)/(parseFloat(order?.quantity)/parseFloat(order?.take_profit?.currentPrice)))).toFixed(2)}`;
            }
        }

        queryElements.push(takeProfitQuery);
    }

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

    // trailing: { status: true, option: [ [Object], [Object] ] },
    // withoutLoss: {
    //     status: true,
    //         option: {
    //         price: 0.2,
    //             deviation: 0.2,
    //             isDeviationType: 'fixed',
    //             isPriceType: 'fixed'
    //     }
    // }

    console.log(order)
    if (order?.trailing?.status && order?.withoutLoss?.status) {

    } else {
        if(order?.trailing?.status){

        } else if(order?.withoutLoss?.status){
            const cross = order?.withoutLoss?.option?.isPriceType !== 'fixed' ? ((parseFloat(order?.currentPrice) * parseFloat(order?.withoutLoss?.option?.price))/100) : parseFloat(order?.withoutLoss?.option?.price)
            const fee = ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice)*(parseFloat(order?.withoutLoss?.option?.commission)*2))

            if(order?.positionSide === 'SHORT'){

                // orderId: '0',
                //     userId: 'saf',
                //     q: 10,
                //     positionSide: 'LONG',
                //     symbol: 'BTCUSDT',
                //     fixPrice: 33400.0,
                //     minDeviation: 33399.0,
                //     maxDeviation: 33401.00,
                //     fix: false,
                //     fixDeviation: false

                const withousLossShort = ((
                            ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice))
                            -
                            (parseFloat(cross)+parseFloat(fee))
                        )
                        *
                        parseFloat(order?.currentPrice)
                    )
                    /
                    ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice))

                ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false, fixedPrice:withousLossShort}}

                console.log('withousLossShort',withousLossShort)

            } else{

                console.log('withousLossLong')
                const withousLossLong = ((
                            ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice))
                            +
                            (parseFloat(cross)+parseFloat(fee))
                        )
                        *
                        parseFloat(order?.currentPrice)
                    )
                    /
                    ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.currentPrice))


                console.log('withousLossLONG',withousLossLong)

                ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossLong}}

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
    return {queryElements, ordersId}
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