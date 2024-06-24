const {setUserToken} = require("./setUserToken");
const {getUserApi} = require("./getUserApi");
const Order = require("../models/orders.model");
const {streamPrice, setStremPriceSocket} = require("../webSocket/binance.price.socket");
const {createEventsSocket, setSocket} = require("../webSocket/binance.event.socket");
const {getMinimumBuyQuantity} = require("./getMinPrice");
const {getCommisionRate} = require("./getCommisionRate");
const {getAvailableBalance} = require("./getBalance");
const User = require("../models/user.model");
const socketServer = require("../server");

async function getAuthentificate(token, id) {
    try {
        if (token) {
            const user = await setUserToken(token, id)

            if (user) {
                let userData = {}

                const userApis = getUserApi(user)

                const orders = await Order.find({userId: user?._id, opened: true}).sort({createdAt: -1})
                const currency = await Order.distinct('currency', {userId: user?._id, opened: true})

                if (currency?.length) {
                    streamPrice(currency, user?._id, user?.binance_test)
                }

                if (orders?.length) {
                    createEventsSocket(user?.binance_test, userApis?.key_1, userApis?.key_2)
                }

                const modifiedOrders = orders.map(order => {
                    const {_id, ...rest} = order.toObject();
                    return {key: _id, ...rest};
                });


                const minPrice = await getMinimumBuyQuantity(user?.symbol, id, userApis?.key_1, userApis?.key_2)
                const commission = await getCommisionRate(userApis?.key_1, userApis?.key_2, {symbol: user?.symbol}, user)
                const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                userData = {
                    ...userData,
                    positions: modifiedOrders,
                    commission: commission,
                    balance,
                    type_binance: user?.binance_test,
                    currentOption: {
                        ...userData?.currentOption,
                        minCurrencyPrice: minPrice?.minimumQuantity,
                    }
                }

                if (parseFloat(user?.currentOption[user.symbol]?.amount) < parseFloat(minPrice?.minimumQuantity)) {

                    await User.updateOne({_id: user?._id}, {
                        currentOption: {
                            ...user.currentOption,
                            [user.symbol]: {
                                ...user.currentOption[user.symbol],
                                amount: `${minPrice?.minimumQuantity}`
                            }
                        }
                    })

                    userData = {
                        ...userData,
                        symbol: user.symbol,
                        currentOption: {
                            ...userData?.currentOption,
                            ...user?.currentOption[user.symbol],
                            adjustLeverage: minPrice?.response,
                            minCurrencyPrice: minPrice?.minimumQuantity,
                            maxAdjustLeverage: minPrice?.maxAdjustLeverage
                        }
                    }

                } else {

                    userData = {
                        ...userData,
                        auth: true,
                        symbol: user.symbol,
                        currentOption: {
                            ...userData?.currentOption,
                            ...user?.currentOption[user.symbol],
                            adjustLeverage: minPrice?.response,
                            minCurrencyPrice: minPrice?.minimumQuantity,
                            maxAdjustLeverage: minPrice?.maxAdjustLeverage
                        }
                    }
                }

                socketServer.socketServer.io.to(id).emit('userData', {...userData});
                socketServer.socketServer.io.to(id).emit('userMessage', {
                    type: 'success',
                    message: `Успешное подключение к Binance API`,
                });

            } else {
                socketServer.socketServer.io.to(id).emit('userData', {
                    currentOption: false,
                    auth: true,
                });

                socketServer.socketServer.io.to(id).emit('userMessage', {
                    type: 'error',
                    message: `Не удалось подключиться к API`,
                });
            }

        } else {
            socketServer.socketServer.io.to(id).emit('userData', {
                currentOption: false,
                auth: true,
            });
            socketServer.socketServer.io.to(id).emit('userMessage', {
                type: 'error',
                message: `Не удалось идентифицировать пользователя`,
            });
        }

    } catch (e) {
        socketServer.socketServer.io.to(id).emit('userData', {auth: false})
        socketServer.socketServer.io.to(id).emit('userMessage', {
            type: 'error',
            message: `Возникла ошибка при аутентификации`,
        });
        console.error(e)
    }
}

module.exports = getAuthentificate