const User = require("../models/user.model");
const {getUserApi} = require("./getUserApi");
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const Order = require("../models/orders.model");
const {streamPrice, removeStreamPrice} = require("../webSocket/binance.price.socket");
const createSocket = require("../webSocket/binance.macd.socket");
const {cancelOrder} = require("./cancelOrder");
const {createSocketWithoutLoss} = require("../webSocket/wthoutLossSocket");
const {createEventsSocket} = require("../webSocket/binance.event.socket");
const {bot} = require("../bot");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

let socketIo = ''
async function createOrder(orderElement, user) {
    const {order} = orderElement;

    console.log(user?.token)

    const side = order.positionSide === 'LONG' && order?.side === 'BUY' || order?.positionSide === 'SHORT' && order?.side === 'SELL' ? 'BUY' : 'SELL'

    let positionsId,
        ordersId = {},
        positionData,
        orderData = [],
        userId = user?._id,
        opened = true
    let queryElements = [], withoutLossElement = [];

    switch (side) {
        case 'BUY':
            try {

                const qty = ((parseFloat(order?.quantity) * (parseFloat(order?.leverage))) / parseFloat(order?.currentPrice)).toPrecision(1);
                let querySkeleton = {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                };

                const queryString = `symbol=${order?.symbol}&positionSide=${order?.positionSide}&type=MARKET&side=${order?.side}&quantity=${qty}&timestamp=${Date.now()}`

                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                createEventsSocket(user?.binance_test,key_1,key_2)

                const signature = getSignature(queryString, key_2)
                const headers = getHeaders(key_1)

                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order/test?${queryString}&signature=${signature}`, null, {
                    headers,
                }).then(async (response) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE ORDER: ${JSON.stringify(querySkeleton)}`)
                    if (response && !response?.data[0]?.msg) {

                        const orderPos = await createOrders(order,querySkeleton,user)
                        console.log(orderPos)
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
                                    leverage: order?.leverage,
                                    ordersId: {TRAILING_STOP_MARKET ,TAKE_PROFIT_MARKET, macd:orderPos?.ordersId?.macd, withoutLoss:orderPos?.ordersId?.withoutLoss},
                                    positionData: response.data,
                                    userId,
                                    openedConfig: {
                                        ...querySkeleton,
                                        quantity: parseFloat(order?.quantity) / parseFloat(response.data.avgPrice)
                                    },
                                    currency: order?.symbol,
                                    opened: true
                                });

                                const sybmols = await Order.distinct('currency', {userId: user?._id, opened: true})

                                streamPrice(sybmols, user?.token,  user?.binance_test)

                                if (socketIo) {
                                    socketIo.to(user?.token).emit('userMessage', {
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
                                    socketIo.to(user?.token).emit('updatePositionCreated', {
                                        positionList: modifiedOrders,
                                    });
                                }
                            })
                        }).catch((e) => {
                            console.log(e)
                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CREATE ORDER STEP 2: ${JSON.stringify(e?.response?.data)}`)
                            if (socketIo) {
                                socketIo.to(user?.token).emit('userMessage', {
                                    type: 'error',
                                    message: `${e?.response?.data?.msg}`
                                });
                            }
                        })
                    }
                }).catch((e) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CREATE ORDER: ${JSON.stringify(e?.response?.data)}`)
                    if (socketIo) {
                        socketIo.to(user?.token).emit('userMessage', {
                            type: 'error',
                            message: `${e?.response?.data?.msg}`
                        });
                    }
                });
            } catch (e){
                console.error(e)
            }
        break;
        case 'SELL':
            try {

                const qty = order?.quantity
                let querySkeleton = {
                    symbol: order?.symbol,
                    positionSide: order?.positionSide,
                    side: order?.side,
                    quantity: qty,
                    type: 'MARKET'
                };

                const queryString = `symbol=${order?.symbol}&positionSide=${order?.positionSide}&type=MARKET&side=${order?.side}&quantity=${qty}&timestamp=${Date.now()}`

                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                const signature = getSignature(queryString, key_2)
                const headers = getHeaders(key_1)

                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order/test?${queryString}&signature=${signature}`, null, {
                    headers,
                }).then(async (response) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CANCELED ORDER ADMIN: ${JSON.stringify(querySkeleton)}`)

                        let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([querySkeleton]))}&timestamp=${Date.now()}`;
                        const signatureBatch = getSignature(queryStringBatch, key_2)

                        axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                            headers,
                        }).then(async (responseBatch) => {

                            if(responseBatch && !responseBatch?.data[0]?.msg) {

                                let queryStringCheck = `symbol=${responseBatch?.data[0].symbol}&orderId=${responseBatch?.data[0].orderId}&timestamp=${Date.now()}`;
                                const signatureCheck = getSignature(queryStringCheck, key_2)

                                axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryStringCheck}&signature=${signatureCheck}`, {
                                    headers: headers,
                                }).then(async (response) => {

                                   const updatedOrder = await Order.findOneAndUpdate({_id: order?.id}, {
                                        ClosePositionData: response?.data,
                                        opened:false
                                    },
                                       { returnDocument: 'after' });

                                   if(updatedOrder?.ordersId?.TAKE_PROFIT_MARKET || updatedOrder?.ordersId?.TRAILING_STOP_MARKET){
                                       cancelPositionOrder(responseBatch?.data[0]?.symbol, updatedOrder, user, key_1, key_2)
                                   }

                                    const message = `#${updatedOrder?.currency} продажа по рынку\n\nКол-во: ${response?.data?.origQty}\nЦена покупки: ${updatedOrder?.startPrice}\n\nЦена продажи: ${response?.data?.avgPrice}\nСумма: ${(parseFloat(response?.data?.origQty) * parseFloat(response?.data?.avgPrice)).toFixed(4)}\nПрибыль: ${response?.data?.origQty}\n\nid: ${updatedOrder?._id}`
                                    bot.telegram.sendMessage(user?.chat_id, message)

                                    if (socketIo) {

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

                                        socketIo.to(user?.token).emit('updatePositionCreated', {
                                            positionList: modifiedOrders,
                                        });

                                        socketIo.to(user?.token).emit('updatePositionBefore', {
                                            positionList: modifiedBeforeOrders,
                                        });

                                        socketIo.to(user?.token).emit('userMessage', {
                                            type: 'success',
                                            message: `Позиция успешно закрыта`
                                        });
                                    }

                                    removeStreamPrice(user?.token)
                                }).catch((e) => {
                                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${JSON.stringify(e.response.data)}`)
                                    if (socketIo) {
                                        socketIo.to(user?.token).emit('userMessage', {
                                            type: 'error',
                                            message: `Ошибка закрытия позиции: ${e?.response?.data?.msg}`
                                        });
                                    }
                                })
                            } else{
                                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2 (ORDER NOR CURRENTS): ${JSON.stringify(responseBatch?.data[0]?.msg)}`)

                                if (socketIo) {

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

                                    socketIo.to(user?.token).emit('updatePositionCreated', {
                                        positionList: modifiedOrders,
                                    });

                                    socketIo.to(user?.token).emit('updatePositionBefore', {
                                        positionList: modifiedBeforeOrders,
                                    });

                                    socketIo.to(user?.token).emit('userMessage', {
                                        type: 'error',
                                        message: `Ошибка закрытия позиции: ${responseBatch?.data[0]?.msg}`
                                    });

                                    removeStreamPrice(user?.token)
                                }
                            }
                        }).catch(async (e) => {
                            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${JSON.stringify(e?.response?.data)}`)

                            socketIo.to(user?.token).emit('userMessage', {
                                type: 'error',
                                message: `Ошибка закрытия позиции: ${e?.response?.data?.msg}`
                            });
                        })

                }).catch((e) => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER: ${JSON.stringify(e?.response?.data)}`)
                    if (socketIo) {
                        socketIo.to(user?.token).emit('userMessage', {
                            type: 'error',
                            message: `${e?.response?.data?.msg}`
                        });
                    }
                });

                // if (data[0]?.code !== undefined) {
                //     for (const err of data) {
                //         if (socket?.id && io || io && user?.token) {
                //             io.to(user?.token).emit('userMessage', {
                //                 type: 'error',
                //                 message: `${err.msg}`
                //             });
                //         }
                //     }
                // } else {
                //     if (data && order?.positionSide === 'LONG' && order?.side === 'BUY' || data && order?.positionSide === 'SHORT' && order?.side === 'SELL') {
                //         let currencySymbol = response.data[0].symbol,
                //             openedConfig = queryElements
                //
                //         let queryString2 = `symbol=${data[0].symbol}&orderId=${data[0].orderId}&timestamp=${Date.now()}`;
                //         const newsignature = getSignature(queryString2, key_2)
                //
                //         const checkOrder = await axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryString2}&signature=${newsignature}`, {
                //             headers: headers,
                //         });
                //         // console.log(checkOrder?.data)
                //         // console.log(checkOrder.data)
                //         // for(const pos of data){
                //         //     if(pos?.type === 'MARKET') {
                //         //         positionsId = pos?.orderId
                //         //         positionData = {...pos}
                //         //     } else if(pos?.type !== 'MARKET'){
                //         //         ordersId.push(`${pos?.orderId}`)
                //         //         orderData.push({...pos})
                //         //     }
                //         // }
                //
                //         console.log(ordersId?.withoutLoss?.status)
                //         if(ordersId?.withoutLoss?.status)
                //             createSocketWithoutLoss(checkOrder.data.orderId, checkOrder.data.orderId, order?.symbol, ordersId?.withoutLoss?.fixedPrice, user?.binance_test, io)
                //         // ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossLong}}
                //
                //
                //
                //         for(const orderList of data)
                //         {
                //             if(orderList?.type === 'TAKE_PROFIT_MARKET')
                //             {
                //                 ordersId = {...ordersId, ['TAKE_PROFIT_MARKET']: {...orderList}}
                //             } else if(orderList?.type === 'TRAILING_STOP_MARKET'){
                //                 ordersId = {...ordersId, ['TRAILING_STOP_MARKET']: {...orderList}}
                //             } else if(orderList?.type === 'TRAILING_STOP_MARKET'){
                //
                //             }
                //         }
                //
                //
                //
                //
                //         // if(data[0]?.type === 'TAKE_PROFIT_MARKET')
                //         //     ordersId = {...ordersId, ['TAKE_PROFIT_MARKET']: {...data[0]}}
                //         // // TRAILING_STOP_MARKET
                //         // if(data[1]?.type === 'TAKE_PROFIT_MARKET')
                //         //     ordersId = {...ordersId, ['TAKE_PROFIT_MARKET']: {...data[1]}}
                //         //
                //         // if(data[2]?.type === 'TAKE_PROFIT_MARKET')
                //         //     ordersId = {...ordersId, ['TAKE_PROFIT_MARKET']: {...data[2]}}
                //
                //         if (order?.macd?.status && !order?.withoutLoss?.status) {
                //             ordersId = {...ordersId, ['macd']: {...order?.macd}}
                //             createSocket.createSocket({
                //                 id: socket.id,
                //                 orderId: checkOrder.data.orderId,
                //                 symbol: order?.symbol,
                //                 interval: `${order?.macd?.timeFrame}`,
                //                 number: `${order?.macd?.number}`,
                //                 type: order?.macd?.type,
                //                 type_g: order?.macd?.type_g,
                //                 test: user?.binance_test,
                //                 io
                //             })
                //         }
                //
                //         await Order.insertMany({
                //             positionsId: checkOrder.data.orderId,
                //             startPrice: checkOrder.data.avgPrice,
                //             leverage: order?.leverage,
                //             ordersId: {...ordersId},
                //             positionData: checkOrder.data,
                //             orderData: {},
                //             userId,
                //             openedConfig: {...openedConfig[0],quantity:parseFloat(order?.quantity)/parseFloat(checkOrder.data.avgPrice)},
                //             currency: currencySymbol,
                //             opened
                //         });
                //
                //         if (socket?.id && io || io && user?.token) {
                //             io.to(user?.token).emit('userMessage', {
                //                 type: 'success',
                //                 message: `Позиция успешно открыта`
                //             });
                //         }
                //
                //
                //         const sybmols = await Order.distinct('currency', {userId: user?._id, opened: true})
                //
                //         streamPrice(sybmols, socket.id, io, user?.binance_test)
                //
                //         if (socket?.id && io || io && user?.token) {
                //             const orders = await Order.find({userId: user?._id, opened: true}).sort({createdAt: -1})
                //             const modifiedOrders = orders.map(order => {
                //                 const { _id, ...rest } = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                //                 return { key: _id, ...rest };
                //             });
                //             io.to(user?.token).emit('updatePositionCreated', {
                //                 positionList: modifiedOrders,
                //             });
                //         }
                //     } else if (data && order?.positionSide === 'LONG' && order?.side === 'SELL' || data && order?.positionSide === 'SHORT' && order?.side === 'BUY') {
                //
                //         let queryString2 = `symbol=${data[0].symbol}&orderId=${data[0].orderId}&timestamp=${Date.now()}`;
                //         const newsignature = getSignature(queryString2, key_2)
                //
                //         const checkOrder = await axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryString2}&signature=${newsignature}`, {
                //             headers: headers,
                //         });
                //
                //
                //         if (socket?.id && io || io && user?.token) {
                //             const findOrder = await Order.findOne({_id: order?._id})
                //             cancelOrder(order?.symbol, findOrder?.ordersId, order?._id, io, socket)
                //             io.to(user?.token).emit('userMessage', {
                //                 type: 'success',
                //                 message: `Позиция успешно закрыта`
                //             });
                //             const orders = await Order.find({userId: user?._id, opened: true}).sort({createdAt: -1})
                //             const ordersBefore = await Order.find({userId: user?._id, opened: false}).sort({updatedAt: -1})
                //             const modifiedOrders = orders.map(order => {
                //                 const { _id, ...rest } = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                //                 return { key: _id, ...rest };
                //             });
                //             const modifiedBeforeOrders = ordersBefore.map(order => {
                //                 const { _id, ...rest } = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                //                 return { key: _id, ...rest };
                //             });
                //             io.to(user?.token).emit('updatePositionCreated', {
                //                 positionList: modifiedOrders,
                //             });
                //             io.to(user?.token).emit('updatePositionBefore', {
                //                 positionList: modifiedBeforeOrders,
                //             });
                //         }
                //         removeStreamPrice(socket.id)
                //     }
                //
                // }
                // } catch (error) {
                //     console.error(error)
                // }

            } catch (e){
                console.error()
            }


            break;
        default:
            console.log('tut2')
    }



    //
    // let positionsId,
    //     ordersId = {},
    //     positionData,
    //     orderData = [],
    //     userId = user?._id,
    //     opened = true
    //
    // let queryElements = [], withoutLossElement = [];
    //
    // const qty = order?.positionSide === 'LONG' && order?.side === 'BUY' || order?.positionSide === 'SHORT' && order?.side === 'SELL' ? ((parseFloat(order?.quantity) * (parseFloat(order?.leverage))) / parseFloat(order?.currentPrice)).toPrecision(1) : order?.quantity;
    //
    // const querySkeleton = {symbol: order?.symbol, positionSide: order?.positionSide, side: order?.side, quantity: qty};
    // {
    //     let marketPosition = {...querySkeleton};
    //     marketPosition.type = 'MARKET';
    //     queryElements.push(marketPosition);
    // }
    //


    // if (order?.macd?.status && !order?.withoutLoss?.status) {

        // createSocket.createSocket({
        //     id: socket?.id,
        //     orderId: socket?.id,
        //     symbol: order?.symbol,
        //     interval: `${order?.macd?.timeFrame}`,
        //     number: `${order?.macd?.number}`,
        //     type: order?.macd?.type,
        //     type_g: order?.macd?.type_g,
        //     test: user?.binance_test,
        //     socket,
        //     io
        // })

        // console.log(order?.macd)
        // let trailingStopMarketQuery = {...querySkeleton};
        // trailingStopMarketQuery.side = querySkeleton.side; // IDK what should be in trailing
        //
        // trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
        // if(order?.trailing?.percent) {
        //     trailingStopMarketQuery.callbackRate = (order?.trailing?.stopPrice).toFixed(2);
        // } else {
        //     trailingStopMarketQuery.callbackRate = ((order?.trailing?.stopPrice / order?.trailing?.currentPrice) * 100).toFixed(2);
        // }
        //
        // queryElements.push(trailingStopMarketQuery);
    // }
    //

    //
    //
    // //
    // // startOrderUpdate(key_1,key_2,user?.binance_test)
    // // console.log(queryElements)
    // let queryString = `batchOrders=${encodeURIComponent(JSON.stringify(queryElements))}&timestamp=${Date.now()}`;
    // const signature = getSignature(queryString, key_2)
    //
    // const headers = getHeaders(key_1)
    //


    // END

    // const existingUser = await User.findOne({ username });
    // if (existingUser) {
    //     return res.json({ message: "Пользователь уже существует" });
    // }
    // const user = await User.create({ password, username, entree });
    // res.json({ message: "Пользователя зарегистрировано", success: true });
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
            takeProfitQuery.stopPrice = `${(order?.take_profit?.stopPrice).toFixed(2)}`;
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
    if (order?.trailing?.status || order?.withoutLoss?.status) {

        if(!order?.withoutLoss?.status && order?.trailing?.status){
            let trailingStopMarketQuery = {...querySkeleton};
            trailingStopMarketQuery.side = querySkeleton.positionSide === 'LONG' ? 'SELL' : 'BUY';

            trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;

            if (order?.trailing?.percent) {
                trailingStopMarketQuery.callbackRate = `${(order?.trailing?.stopPrice).toFixed(2)}`;
            } else {
                trailingStopMarketQuery.callbackRate = `${((order?.trailing?.stopPrice / order?.trailing?.currentPrice) * 100).toFixed(2)}`;
            }

            queryElements.push(trailingStopMarketQuery);
        }
        else if(order?.withoutLoss?.status){

            const cross = order?.withoutLoss?.percent && order?.withoutLoss?.status ? ((parseFloat(order?.withoutLoss?.currentPrice) * parseFloat(order?.withoutLoss?.stopPrice))/100) : parseFloat(order?.withoutLoss?.stopPrice)
            const fee = ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice)*(parseFloat(order?.withoutLoss?.commission)*2))

            if(order?.positionSide === 'SHORT'){

                const withousLossShort = ((
                            ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
                            -
                            (parseFloat(cross)+parseFloat(fee))
                        )
                        *
                        parseFloat(order?.withoutLoss?.currentPrice)
                    )
                    /
                    ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))

                ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossShort}}

                if(order?.trailing?.status) {
                    createTrailing(withousLossShort)
                }

                console.log('withousLossShort',withousLossShort)

            } else{
                const withousLossLong = ((
                            ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))
                            +
                            (parseFloat(cross)+parseFloat(fee))
                        )
                        *
                        parseFloat(order?.withoutLoss?.currentPrice)
                    )
                    /
                    ((parseFloat(order?.quantity)*parseFloat(order?.leverage))*parseFloat(order?.withoutLoss?.currentPrice))


                console.log('withousLossLONG',withousLossLong)

                ordersId = {...ordersId, ['withoutLoss']: {...order?.withoutLoss, fixed:false,fixedPrice:withousLossLong}}

                if(order?.trailing?.status) {
                    createTrailing(withousLossLong)
                }


            }


            function createTrailing(activationPrice){
                let trailingStopMarketQuery = {...querySkeleton};
                trailingStopMarketQuery.side = querySkeleton.positionSide === 'LONG' ? 'SELL' : 'BUY'; // IDK what should be in trailing

                trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
                if (order?.trailing?.percent) {
                    trailingStopMarketQuery.callbackRate = `${(order?.trailing?.stopPrice).toFixed(2)}`;
                    trailingStopMarketQuery.activatePrice = `${activationPrice}`
                } else {
                    trailingStopMarketQuery.callbackRate = `${((order?.trailing?.stopPrice / order?.trailing?.currentPrice) * 100).toFixed(2)}`;
                    trailingStopMarketQuery.activatePrice = `${activationPrice}`
                }

                queryElements.push(trailingStopMarketQuery);
            }
        }

    }
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


async function setCreatedOrderSocket(io) {
    if(!socketIo)
        socketIo = io
}

async function deletedCreatedOrderSocket() {
    if(socketIo)
        socketIo = ''
}

exports.setCreatedOrderSocket = setCreatedOrderSocket
exports.deletedCreatedOrderSocket = deletedCreatedOrderSocket
exports.createOrder = createOrder