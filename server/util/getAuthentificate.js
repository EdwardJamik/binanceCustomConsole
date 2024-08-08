const {setUserToken} = require("./setUserToken");
const {getUserApi} = require("./getUserApi");
const Order = require("../models/orders.model");
const PreSetting = require("../models/presetting.model");
const {streamPrice, setStremPriceSocket} = require("../webSocket/binance.price.socket");
const {createEventsSocket, setSocket} = require("../webSocket/binance.event.socket");
const {getMinimumBuyQuantity} = require("./getMinPrice");
const {getCommisionRate} = require("./getCommisionRate");
const {getAvailableBalance} = require("./getBalance");
const User = require("../models/user.model");
const socketServer = require("../server");

function roundDecimbal(num) {
    let strNum = num.toString();

    if (strNum.includes('e')) {
        num = parseFloat(num).toFixed(9);
        strNum = num.toString();
    }

    let dotIndex = strNum.indexOf('.');

    if (dotIndex === -1 || dotIndex === strNum.length - 1) {
        return parseFloat(num);
    } else {
        return strNum.slice(0, dotIndex + 1);
    }
}

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

                let userFavorite = []

                if(user?.favorite?.length)
                    userFavorite = user?.favorite?.map(pair => ({ label: `${pair?.name} (${pair?.list?.length})`, value: pair.id }));

                const minPrice = await getMinimumBuyQuantity(user?.symbol, id, userApis?.key_1, userApis?.key_2)
                const commission = await getCommisionRate(userApis?.key_1, userApis?.key_2, {symbol: user?.symbol}, user)
                const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                const preSetting = await PreSetting.distinct('name',{user_id: user?._id})

                if (parseFloat(user?.currentOption?.amount) < parseFloat(minPrice?.minimumQuantity)) {
                    userData = {
                        ...userData,
                        symbol: user.symbol,
                        isAuthenticated: true,
                        positions: modifiedOrders,
                        commission: commission,
                        favorite: userFavorite,
                        balance,
                        preSetting,
                        isOpened:true,
                        selectedPreSetting: user?.preSetting,
                        type_binance: user?.binance_test,
                        currentOption: {
                            amount: roundDecimbal(`${minPrice?.minimumQuantity}`),
                            adjustLeverage: minPrice?.response,
                            minCurrencyPrice: minPrice?.minimumQuantity,
                            maxAdjustLeverage: minPrice?.maxAdjustLeverage
                        }
                    }
                } else {
                    userData = {
                        ...userData,
                        symbol: user.symbol,
                        isAuthenticated: true,
                        positions: modifiedOrders,
                        commission: commission,
                        favorite:userFavorite,
                        balance,
                        preSetting,
                        isOpened:true,
                        selectedPreSetting: user?.preSetting,
                        type_binance: user?.binance_test,
                        currentOption: {
                            ...user?.currentOption,
                            adjustLeverage: minPrice?.response,
                            minCurrencyPrice: minPrice?.minimumQuantity,
                            maxAdjustLeverage: minPrice?.maxAdjustLeverage
                        }
                    }
                }

                socketServer.socketServer.io.to(id).emit('userData', {...userData});
                // socketServer.socketServer.io.to(id).emit('userMessage', {
                //     type: 'success',
                //     message: `Успешное подключение к Binance API`,
                // });

            } else {
                socketServer.socketServer.io.to(id).emit('userData', {
                    currentOption: false,
                    auth: false,
                    isAuthenticated:false,
                });

                socketServer.socketServer.io.to(id).emit('userMessage', {
                    type: 'error',
                    message: `Не удалось идентифицировать пользователя или подключится к API`,
                });
            }

        } else {
            socketServer.socketServer.io.to(id).emit('userData', {
                currentOption: false,
                auth: false,
                isAuthenticated:false,
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