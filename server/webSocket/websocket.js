const { Server } = require("socket.io");
const http = require("http");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const User = require('../models/user.model')
const {getSignature, getHeaders} = require("../util/signature");
const axios = require("axios");
const {removeStreamPrice} = require("./binance.price.socket");
const {getMinimumBuyQuantity} = require("../util/getMinPrice");
const {getUserApi} = require("../util/getUserApi");

const {createOrder} = require("../util/createOrder");
const {cancelOrder} = require("../util/cancelOrder");
const getAuthentificate = require("../util/getAuthentificate");

class SocketIOServer {
    constructor(port, app) {
        this.app = app;
        this.server = http.createServer(this.app);
        this.io = new Server(this.server,{
            cors: {origin:true, methods: ["GET", "POST"]},
        });

        this.values = [];

        this.io.on('connection', (socket) => {

            socket.on('authenticate', async ({ token }) => {
                try {
                    await getAuthentificate(token,socket.id)
                    const {_id} = await User.findOne({token: socket.id})
                    socket.join(_id);
                } catch (e){
                    console.error(e)
                }
            });

            socket.on('waitLogin', async ({key}) => {
                try {
                    socket.join(key);
                } catch (e){
                    console.error(e)
                }
            });

            socket.on('setSize', async (data) => {
                const user = await User.findOne({token: socket.id})

                if (user) {
                    const userData = {
                        ...data.user,
                        amount: data.value,
                    }

                    this.io.to(socket.id).emit('userData', {
                        currentOption: {
                            amount: data.value,
                        }
                    });

                    await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption,[`${user.symbol}`]:userData}})
                }
            });

            socket.on('setUserData', async ({value}) => {
                const user = await User.findOne({token: socket.id})

                if (user) {
                    if (value) {
                        this.io.to(socket.id).emit('userData', {
                            currentOption: value,
                            type_binance: user?.binance_test,
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
                cancelOrder(symbol,id_order,id,socket.id)
            });

            socket.on('createOrder', async (data) => {

                const user = await User.findOne({token: socket?.id})

                createOrder(data, user, socket.id)
            });

            socket.on('setLeverage', async (data) => {
                let userData = {}

                if (data.value >= 1) {
                    const user = await User.findOne({token: socket.id})

                    if (user) {
                        const userApis = getUserApi(user)

                        const timestamp = Date.now()
                        const signature = getSignature(`symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}`, userApis?.key_2)
                        const headers = getHeaders(userApis?.key_1)
                        axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/leverage?symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}&signature=${signature}`, {},{headers}).then(async (response) => {
                            if (response.data.leverage) {

                                const minPrice = await getMinimumBuyQuantity(user.symbol, socket, userApis?.key_1, userApis?.key_2)

                                userData = {
                                    currentOption: {
                                        amount: parseFloat(user?.currentOption[user.symbol].amount) < parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price) ? (parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price)).toFixed(2) : user?.currentOption[user.symbol].amount,
                                        adjustLeverage: response.data.leverage,
                                        minCurrencyPrice: minPrice?.minimumQuantity
                                    }
                                }

                                this.io.to(socket.id).emit('userMessage', {
                                    type: 'success',
                                    message: `Кредитное плечо успешно изменено`
                                });

                                await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption,[`${user.symbol}`]: {...user.currentOption[`${user.symbol}`],adjustLeverage: response.data.leverage}}})
                            } else {
                                this.io.to(socket.id).emit('userMessage', {
                                    type: 'error',
                                    message: `Кредитное плечо не изменено, обновите страницу`,
                                });
                            }
                        }).catch((e) => {
                            console.error(e)

                            this.io.to(socket.id).emit('userMessage', {
                                type: 'error',
                                message: `Ошибка при изменения кредитного плеча: ${e}`,
                            });
                        });
                    } else {
                        this.io.to(socket.id).emit('userMessage', {
                            type: 'error',
                            message: `Пользователя не существует`,
                        });
                    }
                }

            });

            socket.on('changeCurrency', async (data) => {
                let userData = {}

                if (data) {
                    const user = await User.findOne({token: socket.id})
                    if (user) {
                        const userApis = getUserApi(user)

                        const minPrice = await getMinimumBuyQuantity(data, socket.id, userApis?.key_1, userApis?.key_2)

                        if (minPrice) {
                            if (user?.currentOption[data]) {
                                if (parseFloat(user?.currentOption[data]?.amount) < parseFloat(minPrice?.minimumQuantity)) {

                                    userData = {
                                        symbol: data,
                                        type_binance: user?.binance_test,
                                        currentOption: {
                                            ...user?.currentOption[data],
                                            amount: `${minPrice?.minimumQuantity}`,
                                            adjustLeverage: minPrice?.response,
                                            minCurrencyPrice: minPrice?.minimumQuantity,
                                            maxAdjustLeverage:minPrice?.maxAdjustLeverage
                                        },
                                    }

                                    this.io.to(socket.id).emit('userData', userData);

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

                                    userData = {
                                        symbol: data,
                                        type_binance: user?.binance_test,
                                        currentOption: {
                                            ...user?.currentOption[data],
                                            adjustLeverage: minPrice?.response,
                                            minCurrencyPrice: minPrice?.minimumQuantity,
                                            maxAdjustLeverage:minPrice?.maxAdjustLeverage
                                        },
                                    }

                                    this.io.to(socket.id).emit('userData', userData);

                                    // io.to(socket.id).emit('updateMinPrice',
                                    //     minPrice?.minimumQuantity
                                    // );

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

                                console.log('tut')
                                this.io.to(socket.id).emit('userData', userData);
                            }
                        } else {
                            this.io.to(socket.id).emit('userMessage', {
                                type: 'error',
                                message: `Ошибка, не удалось загрузить кредитное плечо валютной пары ${data.symbol}`,
                            });
                        }

                    } else {
                        this.io.to(socket.id).emit('userMessage', {
                            type: 'error',
                            message: `Пользователя не существует`,
                        });
                    }


                } else {
                    this.io.to(socket.id).emit('userMessage', {
                        type: 'error',
                        message: `Ошбика при получение минимальной цены`,
                    });
                }

            });


            socket.on('disconnect', async () => {
                    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLIENT '${socket?.id}' DISCONNECT IO SESSION`);
                    removeStreamPrice(socket.id)
                    await User.updateOne({token: socket.id}, {token: null})
                }
            );

        });

        this.server.listen(port, () => {
            console.log(`Socket.IO server running at http://localhost:${port}/`);
        });
    }

}

module.exports = SocketIOServer;

