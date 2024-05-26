const { Server } = require("socket.io");
const http = require("http");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TOKEN_BINANCE_KEY} = process.env
const SOCKET_PORT = process.env.SOCKET_PORT || 5050;
const app = require('../server')
const server = http.createServer(app);
const User = require('../models/user.model')
const Order = require('../models/orders.model')
const {getSignature, getHeaders} = require("../util/signature");
const axios = require("axios");
const {streamPrice,removeStreamPrice, setStremPriceSocket, deletedStreamPriceSocket} = require("./binance.price.socket");
const {getMinimumBuyQuantity} = require("../util/getMinPrice");
const {getUserApi} = require("../util/getUserApi");
const {getLeverage} = require("../util/getLeverage");
const {setUserToken} = require("../util/setUserToken");
const {getLeverageBracket} = require("../util/getLeverageBracket");

// const createSocket = require("./macdSocket");
const {createOrder, setCreatedOrderSocket, deletedCreatedOrderSocket} = require("../util/createOrder");
const {getCommisionRate} = require("../util/getCommisionRate");
const {getAvailableBalance} = require("../util/getBalance");
const {cancelOrder, setCancelOrderSocket, deletedCancelOrderSocket} = require("../util/cancelOrder");
const {createEventsSocket, setSocket, deletedSocket} = require("./binance.event.socket");
const {deletedMacdSocket, setMacdSocket} = require("./binance.macd.socket");
const Binance = require('binance-api-node').default;

const io = new Server(server, {
    cors: {origin:true, methods: ["GET", "POST"]},
});

io.on('connection', (socket) => {

    socket.on('authenticate', async ({ token }) => {
        try {
            if (token) {

                const user = await setUserToken(token, socket)

                if (user) {
                    const userApis = getUserApi(user)
                    let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                    socket.join(user?._id)
                    // const response = await getLeverage(key_1, key_2, {symbol: user.symbol}, user)
                    // const maxAdjustLeverage = await getLeverageBracket(key_1,key_2,{symbol: user.symbol}, user)

                    // if (response && maxAdjustLeverage) {

                    const orders = await Order.find({userId: user?._id, opened: true}).sort({createdAt: -1})
                    const currency = await Order.distinct('currency', {userId: user?._id, opened: true})
                    // const orderMacd = await Order.distinct('currency', {userId: user?._id, opened: true})


                    if (currency?.length) {
                        streamPrice(currency, user?._id, io, user?.binance_test)
                    }

                    if(orders?.length){
                        createEventsSocket(user?.binance_test,key_1,key_2)
                    }

                    setStremPriceSocket(io)
                    setMacdSocket(io)
                    setCancelOrderSocket(io)
                    setCreatedOrderSocket(io)
                    // setMacdSocket
                    // startOrderUpdate([user?._id])
                    const modifiedOrders = orders.map(order => {
                        const {_id, ...rest} = order.toObject();
                        return {key: _id, ...rest};
                    });
                    // createSocketPrice(socket.id, currency)

                    // await startOrderUpdate(key_1, key_2, user?.binance_test)

                    io.to(user?._id).emit('updatePosition', {
                        positionList: modifiedOrders,
                    });

                    const ordersBefore = await Order.find({userId: user?._id, opened: false}).sort({updateOne: -1})

                    io.to(user?._id).emit('updatePositionBefore', {
                        positionList: ordersBefore,
                    });

                    const minPrice = await getMinimumBuyQuantity(user?.symbol, socket, key_1, key_2)

                    io.to(user?._id).emit('updateMinPrice',
                        minPrice?.minimumQuantity
                    );

                    if (parseFloat(user?.currentOption[user.symbol]?.amount) < parseFloat(minPrice)) {

                        await User.updateOne({_id: user?._id}, {
                            currentOption: {
                                ...user.currentOption,
                                [user.symbol]: {
                                    ...user.currentOption[user.symbol],
                                    amount: `${minPrice}`
                                }
                            }
                        })
                        const updatedUser = await User.findOne({_id: user?._id})

                        io.to(user?._id).emit('userData', {
                            symbol: user.symbol,
                            binance_test: user?.binance_test,
                            currentOption: {
                                ...updatedUser?.currentOption[user.symbol],
                                adjustLeverage: minPrice?.response,
                                minCurrencyPrice: minPrice?.minimumQuantity,
                                maxAdjustLeverage: minPrice?.maxAdjustLeverage
                            },
                            auth: true,
                        });

                        getCommisionRate(key_1, key_2, {symbol: user?.symbol}, user, io)


                    } else {
                        io.to(user?._id).emit('userData', {
                            symbol: user.symbol,
                            binance_test: user?.binance_test,
                            currentOption: {
                                ...user?.currentOption[user.symbol],
                                adjustLeverage: minPrice?.response,
                                minCurrencyPrice: minPrice?.minimumQuantity,
                                maxAdjustLeverage: minPrice?.maxAdjustLeverage
                            },
                            auth: true,
                        });
                        getCommisionRate(key_1, key_2, {symbol: user?.symbol}, user, io)
                    }

                    setSocket(io)

                    io.to(user?._id).emit('userMessage', {
                        type: 'success',
                        message: `Успешное подключение к Binance API`
                    });

                    getAvailableBalance(key_1, key_2, user, io)
                } else {
                    io.to(user?._id).emit('userData', {
                        currentOption: false,
                        auth: true,
                    });

                    io.to(user?._id).emit('userMessage', {
                        type: 'error',
                        message: `Не удалось подключиться к API`,
                    });

                }


            } else {
                io.to(socket.id).emit('userMessage', {
                    type: 'error',
                    message: `Не удалось идентифицировать пользователя`,
                });
                io.to(socket.id).emit('userData', {auth: false});
            }
            // }
        } catch (e) {
            io.to(socket.id).emit('userData', {auth: false});
            console.error(e)
        }
    });

    socket.on('setSize', async (data) => {
        console.log(data.value)
        const user = await User.findOne({token: socket.id})

        if (user) {

            const userData = {
                ...data.user,
                amount: data.value,
            }

            io.to(socket.id).emit('userData', {
                currentOption: userData,
                binance_test:user?.binance_test,
                auth: true,
            });

            await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption,[`${user.symbol}`]:userData}})
        }
    });

    socket.on('setUserData', async ({value}) => {
        const user = await User.findOne({token: socket.id})

        if (user) {
            if(value) {
                io.to(socket.id).emit('userData', {
                    currentOption: value,
                    binance_test:user?.binance_test,
                    auth: true,
                });

                await User.updateOne({token: socket.id}, {
                    currentOption: {
                        ...user.currentOption,
                        [`${user.symbol}`]: value
                    }
                })
            }
        }
    });



    socket.on('closeOrder', async (data) => {

        const {symbol,id_order,id} = data
        cancelOrder(symbol,id_order,id,socket)
    });

    socket.on('createOrder', async (data) => {

        const user = await User.findOne({token: socket?.id})

        const userApis = getUserApi(user)
        let key_1 = userApis?.key_1, key_2 = userApis?.key_2


        createOrder(data, user)
    });

    socket.on('getCommission', async (data) => {
        try{
            const user = await setUserToken(token, socket)
            if(user){
                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2
                getCommisionRate(key_1, key_2, {symbol:user?.symbol}, user, io)
            }

        } catch (e) {
            console.error(e)
        }
    })

    socket.on('setLeverage', async (data) => {
        if (data.value >= 1) {

            const user = await User.findOne({token: socket.id})

            if (user) {
                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                const timestamp = Date.now()
                const signature = getSignature(`symbol=${user.symbol}&leverage=${data.value}&timestamp=${timestamp}`, key_2)
                const headers = getHeaders(key_1)
                axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/leverage?symbol=${user.symbol}&leverage=${data.value}&timestamp=${timestamp}&signature=${signature}`, {},{headers}).then(async (response) => {
                    if (response.data.leverage) {

                        const minPrice = await getMinimumBuyQuantity(user.symbol, socket, key_1, key_2)

                        const userData = {
                            ...user?.currentOption[user.symbol],
                            amount: parseFloat(user?.currentOption[user.symbol].amount) < parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price) ? (parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price)).toFixed(2) : user?.currentOption[user.symbol].amount,
                            adjustLeverage: minPrice?.response,
                            minCurrencyPrice: minPrice?.minimumQuantity,
                            maxAdjustLeverage:minPrice?.maxAdjustLeverage
                        }

                        io.to(socket.id).emit('userData', {
                            symbol: user?.symbol,
                            binance_test: user?.binance_test,
                            currentOption: userData,
                            auth: true,
                        });

                        io.to(socket.id).emit('userMessage', {
                            type: 'success',
                            message: `Кредитное плечо успешно изменено`
                        });

                        await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption,[`${user.symbol}`]: {...user.currentOption[`${user.symbol}`],adjustLeverage: response.data.leverage}}})
                    } else {
                        io.to(socket.id).emit('userMessage', {
                            type: 'error',
                            message: `Кредитное плечо не изменено, обновите страницу`,
                        });
                    }
                }).catch((e) => {
                    console.error(e)

                    io.to(socket.id).emit('userMessage', {
                        type: 'error',
                        message: `Ошибка при изменения кредитного плеча: ${e}`,
                    });
                });
            } else {
                io.to(socket.id).emit('userMessage', {
                    type: 'error',
                    message: `Пользователя не существует`,
                });
            }
        }

    });

    socket.on('changeCurrency', async (data) => {

        if (data) {
            const user = await User.findOne({token: socket.id})
            if (user) {

                const userApis = getUserApi(user)
                let key_1 = userApis?.key_1, key_2 = userApis?.key_2

                const minPrice = await getMinimumBuyQuantity(data, socket, key_1, key_2)
                if (minPrice) {
                    if (user?.currentOption[data]) {


                        if (parseFloat(user?.currentOption[data]?.amount) < parseFloat(minPrice?.minimumQuantity)) {

                            io.to(socket.id).emit('userData', {
                                symbol: data,
                                binance_test: user?.binance_test,
                                currentOption: {
                                    ...user?.currentOption[data],
                                    amount: `${minPrice?.minimumQuantity}`,
                                    adjustLeverage: minPrice?.response,
                                    minCurrencyPrice: minPrice?.minimumQuantity,
                                    maxAdjustLeverage:minPrice?.maxAdjustLeverage
                                },
                                auth: true,
                            });

                            io.to(socket.id).emit('updateMinPrice',
                                minPrice?.minimumQuantity
                            );

                            await User.updateOne({_id: user?._id}, {
                                symbol: data,
                                currentOption: {
                                    ...user?.currentOption,
                                    [data]: {
                                        ...user.currentOption[data],
                                        amount: `${minPrice?.minimumQuantity}`,
                                        adjustLeverage: minPrice?.response
                                    }
                                }
                            })

                        } else {

                            io.to(socket.id).emit('userData', {
                                symbol: data,
                                binance_test: user?.binance_test,
                                currentOption: {
                                    ...user?.currentOption[data],
                                    adjustLeverage: minPrice?.response,
                                    minCurrencyPrice: minPrice?.minimumQuantity,
                                    maxAdjustLeverage:minPrice?.maxAdjustLeverage
                                },
                                auth: true,
                            });

                            io.to(socket.id).emit('updateMinPrice',
                                minPrice?.minimumQuantity
                            );

                            await User.updateOne({_id: user?._id}, {
                                symbol: data,
                                currentOption: {
                                    ...user?.currentOption,
                                    [data]: {
                                        ...user.currentOption[data],
                                        adjustLeverage: minPrice?.response,
                                    }
                                }
                            })
                        }


                    } else {
                        await User.updateOne({_id: user?._id}, {
                            symbol: data,
                            currentOption: {
                                ...user?.currentOption,
                                [data]: {
                                    currency: data,
                                    amount: `${minPrice?.response}`,
                                    adjustLeverage: minPrice?.response,
                                    currencyPrice: 0,
                                    takeProfit: {
                                        status: false,
                                        price: 0,
                                        procent: false
                                    },
                                    trailing: {
                                        status: false,
                                        price: 0,
                                        procent: false
                                    },
                                    macd: {
                                        status: false,
                                        type: 'LONG',
                                        number: 2,
                                        timeFrame: '5m'
                                    },
                                    withoutLoss: {
                                        status: false,
                                        price: 0,
                                        procent: false
                                    }
                                }
                            }
                        })
                        const updatedUser = await User.findOne({_id: user?._id})
                        io.to(socket.id).emit('userData', {
                            symbol: data,
                            binance_test: user?.binance_test,
                            currentOption: {
                                ...updatedUser?.currentOption[data],
                                minCurrencyPrice: minPrice?.minimumQuantity,
                                maxAdjustLeverage:minPrice?.maxAdjustLeverage

                            },
                            auth: true,
                        });

                        io.to(socket.id).emit('updateMinPrice',
                            minPrice?.response
                        );
                    }
                } else {
                    io.to(socket.id).emit('userMessage', {
                        type: 'error',
                        message: `Ошибка, не удалось загрузить кредитное плечо валютной пары ${data.symbol}`,
                    });
                }

            } else {
                io.to(socket.id).emit('userMessage', {
                    type: 'error',
                    message: `Пользователя не существует`,
                });
            }


        } else {
            io.to(socket.id).emit('userMessage', {
                type: 'error',
                message: `Ошбика при получение минимальной цены`,
            });
        }

    });

    socket.on('message', (data) => {
        console.log(`Повідомлення від клієнта з ідентифікатором сесії ${socket.id}: ${data}`);
        io.to(socket.id).emit('message', data);
    });

    socket.on('disconnect', async () => {
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLIENT '${socket?.id}' DISCONNECT IO SESSION`);
            removeStreamPrice(socket.id)
            deletedSocket()
            deletedMacdSocket()
            deletedStreamPriceSocket()
            deletedCancelOrderSocket()
            deletedCreatedOrderSocket()
            await User.updateOne({token: socket.id}, {token: null})
        }
    );

});

function sendCallInfo(userToken, type, message) {
    console.log('tut')
    // Відправляємо повідомлення клієнту через сокет
    io.to(userToken).emit('userMessage', {
        type: type,
        message: message
    });
}

server.listen(SOCKET_PORT, () => {
    console.log(`Сервер запущено на порту ${SOCKET_PORT}`);
});

module.exports = {
    sendCallInfo
};
