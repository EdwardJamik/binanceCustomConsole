const { Server } = require("socket.io");
const http = require("http");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const User = require('../models/user.model')
const Order = require('../models/orders.model')
const {getSignature, getHeaders} = require("../util/signature");
const axios = require("axios");
const {removeStreamPrice, removeInstrument} = require("./binance.price.socket");
const {getMinimumBuyQuantity} = require("../util/getMinPrice");
const {getUserApi} = require("../util/getUserApi");

const {createOrder} = require("../util/createOrder");
const {cancelOrder} = require("../util/cancelOrder");
const getAuthentificate = require("../util/getAuthentificate");

function trimToFirstInteger(number) {
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
        return parseFloat(`${integerPart + fractionalPart}`);
    else
        return parseFloat(`${integerPart}`);
}

class SocketIOServer {
    constructor(port, app) {
        this.app = app;
        this.server = http.createServer(this.app);
        this.io = new Server(this.server,{
            cors: {origin:true, methods: ["GET", "POST"]},
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.values = [];

        this.io.on('connection', (socket) => {

            socket.on('authenticate', async ({ token }) => {
                try {
                    await getAuthentificate(token,socket.id)
                    const {_id} = await User.findOne({token: socket.id})
                    if(_id)
                        socket.join(String(_id));
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

                    await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption, amount: data.value}})
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
                                ...value
                            }
                        })
                    }
                }
            });

            socket.on('closeOrder', async ({type, id, symbol, userId}) => {

                if(type === 'withoutLoss') {
                    const findOrder = await Order.findOne({_id: String(id)})
                    if (findOrder?.ordersId?.withoutLoss) {
                        await removeInstrument(type, findOrder?.positionsId, symbol, id, findOrder?.userId)
                    }
                } else if(type === 'trailing'){
                    const findOrder = await Order.findOne({_id: String(id)})
                    if(findOrder?.ordersId?.TRAILING_STOP_MARKET){
                        await removeInstrument(type, findOrder?.positionsId, symbol, id, findOrder?.userId)
                    }
                }

            });

            socket.on('createOrder', async (data) => {

                const user = await User.findOne({token: socket?.id})

                createOrder(data, user, String(user?._id))
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
                                const minPrice = await getMinimumBuyQuantity(user.symbol, socket.id, userApis?.key_1, userApis?.key_2)
                                if(user?.currentOption){
                                    userData = {
                                        currentOption: {
                                            amount: parseFloat(user?.currentOption.amount) < parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price) ? parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price) : parseFloat(user?.currentOption.amount),
                                            adjustLeverage: response.data.leverage,
                                            minCurrencyPrice: parseFloat(minPrice?.minimumQuantity),
                                            maxAdjustLeverage: parseFloat(minPrice?.maxAdjustLeverage)
                                        }
                                    }
                                    await User.updateOne({token: socket.id}, {currentOption: {...userData.currentOption}})
                                } else {
                                    userData = {
                                        currentOption: {
                                            amount: parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price),
                                            adjustLeverage: response.data.leverage,
                                            minCurrencyPrice: parseFloat(minPrice?.minimumQuantity),
                                            maxAdjustLeverage: parseFloat(minPrice?.maxAdjustLeverage)
                                        }
                                    }
                                    await User.updateOne({token: socket.id}, {currentOption: {...userData.currentOption}})
                                }

                                this.io.to(socket.id).emit('userData', {...userData});

                                this.io.to(socket.id).emit('userMessage', {
                                    type: 'success',
                                    message: `Кредитное плечо успешно изменено`
                                });


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
                            if (user?.currentOption) {
                                if (parseFloat(user?.currentOption?.amount) < parseFloat(minPrice?.minimumQuantity)) {

                                    userData = {
                                        symbol: data,
                                        type_binance: user?.binance_test,
                                        currentOption: {
                                            ...user?.currentOption,
                                            amount: trimToFirstInteger(`${minPrice?.minimumQuantity}`),
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
                                        }
                                    })

                                } else {

                                    userData = {
                                        symbol: data,
                                        type_binance: user?.binance_test,
                                        currentOption: {
                                            ...user?.currentOption,
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
                                        }
                                    })
                                }


                            } else {
                                await User.updateOne({_id: user?._id}, {
                                    symbol: data,
                                    currentOption: {
                                        ...user?.currentOption,
                                    }
                                })

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
                    // removeStreamPrice(socket.id)
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

