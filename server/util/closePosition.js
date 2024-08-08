const {getHeaders, getSignature} = require("./signature");
const axios = require("axios");
const {getMultipleOrderDetails} = require("./getMultipleOrderDetails");
const Order = require("../models/orders.model");
const User = require("../models/user.model");
const {getAvailableBalance} = require("./getBalance");
const {bot} = require("../bot");
const socketServer = require("../server");
// const logUserEvent = require("./logger");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function closePosition(order, userId, key_1, key_2, binance_test, db_order_id) {

    const currencySkeleton = {
        symbol: order?.symbol,
        positionSide: order?.positionSide,
        side: order?.side,
        quantity: `${order?.quantity}`,
        type: 'MARKET',
    }

    try {
        function priceDecimal(num, counter) {
            let strNum = num.toString();
            let dotIndex = strNum.indexOf('.');
            if (dotIndex === -1 || dotIndex === strNum.length - 1) {
                return num;
            } else {
                return String(strNum.slice(0, dotIndex + counter));
            }
        }

        const headers = getHeaders(key_1)

        // console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CANCELED ORDER INSTRUMENT: ${JSON.stringify(currencySkeleton)}`)

        let queryStringBatch = `batchOrders=${encodeURIComponent(JSON.stringify([{...currencySkeleton}]))}&timestamp=${Date.now()}`;
        const signatureBatch = getSignature(queryStringBatch, key_2)

        const findOrder = await Order.findOne({_id: String(db_order_id)})

        if(!findOrder?.ClosePositionData) {
            axios.post(`https://${binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryStringBatch}&signature=${signatureBatch}`, null, {
                headers,
            }).then(async (responseBatch) => {

                if (responseBatch && !responseBatch?.data[0]?.msg) {

                    getMultipleOrderDetails(responseBatch?.data, key_1, key_2, binance_test).then(async (response) => {

                        const user = await User.findOne({_id: userId})

                        const updatedOrder = await Order.findOneAndUpdate({_id: String(db_order_id)}, {
                            ClosePositionData: response[0],
                            opened: false
                        }, {returnDocument: 'after'});

                        const startPrice = parseFloat(updatedOrder?.startPrice);
                        const closePrice = parseFloat(response[0]?.avgPrice);
                        const cumQuantity = parseFloat(updatedOrder?.positionData?.cumQuote) || 0
                        const cumQuantityClose = updatedOrder?.ClosePositionData?.cumQuote ? parseFloat(updatedOrder?.ClosePositionData?.cumQuote) : parseFloat(updatedOrder?.ClosePositionData?.q) * parseFloat(updatedOrder?.ClosePositionData?.ap);

                        const openCommission = parseFloat(updatedOrder?.commission) || 0
                        const closeCommission = updatedOrder?.ClosePositionData?.cumQuote ? (parseFloat(updatedOrder?.ClosePositionData?.cumQuote) * parseFloat(updatedOrder?.openedConfig?.commission)) : ((parseFloat(updatedOrder?.ClosePositionData?.q) * parseFloat(updatedOrder?.ClosePositionData?.ap)) * parseFloat(updatedOrder?.openedConfig?.commission)) || 0

                        let percent = 0, profit = 0

                        if (updatedOrder?.openedConfig?.positionSide === 'SHORT') {
                            percent = priceDecimal((((startPrice - closePrice) / startPrice) * 100 * parseFloat(updatedOrder?.leverage) - (openCommission + closeCommission)), 3);
                            profit = cumQuantity - cumQuantityClose
                        } else {
                            percent = priceDecimal((((closePrice - startPrice) / startPrice) * 100 * parseFloat(updatedOrder?.leverage) - (openCommission + closeCommission)), 3);
                            profit = cumQuantityClose - cumQuantity
                        }

                        const message = `${percent > 0 ? '🟢' : '🔴'} #${updatedOrder?.currency} продажа по рынку\n\n<b>Кол-во:</b> ${parseFloat(response[0]?.origQty)}\n<b>Цена покупки:</b> ${parseFloat(updatedOrder?.startPrice).toFixed(3)}\n\n<b>Цена продажи:</b> ${parseFloat(response[0]?.avgPrice).toFixed(3)}\n<b>Сумма:</b> ${parseFloat(response[0]?.cumQuote).toFixed(3)}\n<b>Прибыль:</b> ${parseFloat(parseFloat(profit) - (parseFloat(openCommission) + parseFloat(closeCommission))).toFixed(6)} (${percent > 0 ? '+' : ''}${percent}%)\n\n<b>id:</b> <code>${updatedOrder?._id}</code>`

                        await bot.telegram.sendMessage(user?.chat_id, message, {parse_mode: 'HTML'})

                        const orders = await Order.find({
                            userId: userId,
                            opened: true
                        }).sort({createdAt: -1})

                        const modifiedOrders = orders.map(order => {
                            const {_id, ...rest} = order.toObject();
                            return {key: _id, ...rest};
                        });

                        const balance = await getAvailableBalance(key_1, key_2, {binance_test})

                        socketServer.socketServer.io.to(userId).emit('userData', {
                            balance
                        });

                        socketServer.socketServer.io.to(userId).emit('updatePositionCreated', {
                            positionList: modifiedOrders,
                        });

                        socketServer.socketServer.io.to(userId).emit('userMessage', {
                            type: 'success',
                            message: `Позиция успешно закрыта`
                        });

                    }).catch((e) => {
                        console.log(e)
                        console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED ADMIN ORDER STEP 2: ${e}`)
                        socketServer.socketServer.io.to(userId).emit('userMessage', {
                            type: 'error',
                            message: `Ошибка закрытия позиции инструментом: ${e?.response?.msg}`
                        });
                    })
                } else {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED INSTRUMENT ORDER STEP 2 (ORDER NOR CURRENTS): ${JSON.stringify(responseBatch?.data[0]?.msg)}`)

                    await Order.updateOne({_id: db_order_id}, {
                        opened: false
                    });

                    const orders = await Order.find({
                        userId: userId,
                        opened: true
                    }).sort({createdAt: -1})

                    const ordersBefore = await Order.find({
                        userId: userId,
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

                    socketServer.socketServer.io.to(userId).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });

                    socketServer.socketServer.io.to(userId).emit('updatePositionBefore', {
                        positionList: modifiedBeforeOrders,
                    });

                    socketServer.socketServer.io.to(userId).emit('userMessage', {
                        type: 'error',
                        message: `Ошибка закрытия позиции: ${responseBatch?.data[0]?.msg}`
                    });

                    // removeStreamPrice.removeStreamPrice(user?.token)
                }
            }).catch(async (e) => {
                console.log(`[${new Date().toLocaleTimeString('uk-UA')}] ERROR CANCELED INSTRUMENT ORDER STEP 2:`, e?.response)

                socketServer.socketServer.io.to(userId).emit('userMessage', {
                    type: 'error',
                    message: `Ошибка закрытия позиции инструментом: ${e?.response?.data?.msg}`
                });
            })
        }
    } catch (e) {
        console.error()
    }
}

exports.closePosition = closePosition