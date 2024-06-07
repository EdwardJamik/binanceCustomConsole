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
const getAuthentificate = require("../util/getAuthentificate");
const Binance = require('binance-api-node').default;

// const io = new Server(server, {
//     cors: {origin:true, methods: ["GET", "POST"]},
// });

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
                getAuthentificate(token,socket.id)
            });

            // Слухаємо події від користувача
            socket.on('setSize', async (data) => {
                const user = await User.findOne({token: socket.id})

                if (user) {
                    const userData = {
                        ...data.user,
                        amount: data.value,
                    }

                    this.io.to(socket.id).emit('userData', {
                        currentOption: userData,
                        type_binance: user?.binance_test,
                        auth: true,
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
                                            amount: `${minPrice?.minimumQuantity}`,
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
                                            adjustLeverage: minPrice?.response,
                                            minCurrencyPrice: minPrice?.minimumQuantity,
                                            maxAdjustLeverage:minPrice?.maxAdjustLeverage
                                        },
                                        auth: true,
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
// io.on('connection', (socket) => {
//

//
//     // socket.on('getCommission', async (data) => {
//     //     try{
//     //         const user = await setUserToken(token, socket)
//     //         if(user){
//     //             const userApis = getUserApi(user)
//     //             let key_1 = userApis?.key_1, key_2 = userApis?.key_2
//     //             getCommisionRate(key_1, key_2, {symbol:user?.symbol}, user, io)
//     //         }
//     //
//     //     } catch (e) {
//     //         console.error(e)
//     //     }
//     // })
//
//     socket.on('setLeverage', async (data) => {
//         let userData = {}
//
//         if (data.value >= 1) {
//             const user = await User.findOne({token: socket.id})
//
//             if (user) {
//                 const userApis = getUserApi(user)
//                 let key_1 = userApis?.key_1, key_2 = userApis?.key_2
//
//                 const timestamp = Date.now()
//                 const signature = getSignature(`symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}`, key_2)
//                 const headers = getHeaders(key_1)
//                 axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/leverage?symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}&signature=${signature}`, {},{headers}).then(async (response) => {
//                     if (response.data.leverage) {
//
//                         const minPrice = await getMinimumBuyQuantity(user.symbol, socket, key_1, key_2)
//
//                         userData = {
//                             ...user?.currentOption[user.symbol],
//                             auth: true,
//                             currentOption: {
//                                 ...user?.currentOption[user.symbol],
//                                 amount: parseFloat(user?.currentOption[user.symbol].amount) < parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price) ? (parseFloat(minPrice?.minimumQuantity)*parseFloat(data?.price)).toFixed(2) : user?.currentOption[user.symbol].amount,
//                                 adjustLeverage: response.data.leverage,
//                                 minCurrencyPrice: minPrice?.minimumQuantity
//                             }
//                         }
//
//                         io.to(socket.id).emit('userMessage', {
//                             type: 'success',
//                             message: `Кредитное плечо успешно изменено`
//                         });
//
//                         await User.updateOne({token: socket.id}, {currentOption: {...user.currentOption,[`${user.symbol}`]: {...user.currentOption[`${user.symbol}`],adjustLeverage: response.data.leverage}}})
//                     } else {
//                         io.to(socket.id).emit('userMessage', {
//                             type: 'error',
//                             message: `Кредитное плечо не изменено, обновите страницу`,
//                         });
//                     }
//                 }).catch((e) => {
//                     console.error(e)
//
//                     io.to(socket.id).emit('userMessage', {
//                         type: 'error',
//                         message: `Ошибка при изменения кредитного плеча: ${e}`,
//                     });
//                 });
//             } else {
//                 io.to(socket.id).emit('userMessage', {
//                     type: 'error',
//                     message: `Пользователя не существует`,
//                 });
//             }
//         }
//
//     });
//
//     socket.on('changeCurrency', async (data) => {
//         let userData = {}
//
//         if (data) {
//             const user = await User.findOne({token: socket.id})
//             if (user) {
//                 const userApis = getUserApi(user)
//                 let key_1 = userApis?.key_1, key_2 = userApis?.key_2
//
//                 const minPrice = await getMinimumBuyQuantity(data, socket, key_1, key_2)
//                 if (minPrice) {
//                     if (user?.currentOption[data]) {
//                         if (parseFloat(user?.currentOption[data]?.amount) < parseFloat(minPrice?.minimumQuantity)) {
//
//                             userData = {
//                                 ...userData,
//                                 symbol: data,
//                                 type_binance: user?.binance_test,
//                                 currentOption: {
//                                     ...user?.currentOption[data],
//                                     amount: `${minPrice?.minimumQuantity}`,
//                                     adjustLeverage: minPrice?.response,
//                                     minCurrencyPrice: minPrice?.minimumQuantity,
//                                     maxAdjustLeverage:minPrice?.maxAdjustLeverage
//                                 },
//                                 auth: true,
//                             }
//
//                             io.to(socket.id).emit('userData', userData);
//
//                             // io.to(socket.id).emit('updateMinPrice',
//                             //     minPrice?.minimumQuantity
//                             // );
//
//                             await User.updateOne({_id: user?._id}, {
//                                 symbol: data,
//                                 currentOption: {
//                                     ...user?.currentOption,
//                                     [data]: {
//                                         ...user.currentOption[data],
//                                         amount: `${minPrice?.minimumQuantity}`,
//                                         adjustLeverage: minPrice?.response
//                                     }
//                                 }
//                             })
//
//                         } else {
//
//                             userData = {
//                                 ...userData,
//                                 symbol: data,
//                                 type_binance: user?.binance_test,
//                                 currentOption: {
//                                     ...user?.currentOption[data],
//                                     adjustLeverage: minPrice?.response,
//                                     minCurrencyPrice: minPrice?.minimumQuantity,
//                                     maxAdjustLeverage:minPrice?.maxAdjustLeverage
//                                 },
//                                 auth: true,
//                             }
//
//                             io.to(socket.id).emit('userData', userData);
//
//                             // io.to(socket.id).emit('updateMinPrice',
//                             //     minPrice?.minimumQuantity
//                             // );
//
//                             await User.updateOne({_id: user?._id}, {
//                                 symbol: data,
//                                 currentOption: {
//                                     ...user?.currentOption,
//                                     [data]: {
//                                         ...user.currentOption[data],
//                                         adjustLeverage: minPrice?.response,
//                                     }
//                                 }
//                             })
//                         }
//
//
//                     } else {
//                         await User.updateOne({_id: user?._id}, {
//                             symbol: data,
//                             currentOption: {
//                                 ...user?.currentOption,
//                                 [data]: {
//                                     currency: data,
//                                     amount: `${minPrice?.response}`,
//                                     adjustLeverage: minPrice?.response,
//                                     currencyPrice: 0,
//                                     takeProfit: {
//                                         status: false,
//                                         price: 0,
//                                         procent: false
//                                     },
//                                     trailing: {
//                                         status: false,
//                                         price: 0,
//                                         procent: false
//                                     },
//                                     macd: {
//                                         status: false,
//                                         type: 'LONG',
//                                         number: 2,
//                                         timeFrame: '5m'
//                                     },
//                                     withoutLoss: {
//                                         status: false,
//                                         price: 0,
//                                         procent: false
//                                     }
//                                 }
//                             }
//                         })
//                         const updatedUser = await User.findOne({_id: user?._id})
//                         io.to(socket.id).emit('userData', {
//                             symbol: data,
//                             type_binance: user?.binance_test,
//                             currentOption: {
//                                 ...updatedUser?.currentOption[data],
//                                 minCurrencyPrice: minPrice?.minimumQuantity,
//                                 maxAdjustLeverage:minPrice?.maxAdjustLeverage
//
//                             },
//                             auth: true,
//                         });
//
//                         io.to(socket.id).emit('updateMinPrice',
//                             minPrice?.response
//                         );
//                     }
//                 } else {
//                     io.to(socket.id).emit('userMessage', {
//                         type: 'error',
//                         message: `Ошибка, не удалось загрузить кредитное плечо валютной пары ${data.symbol}`,
//                     });
//                 }
//
//             } else {
//                 io.to(socket.id).emit('userMessage', {
//                     type: 'error',
//                     message: `Пользователя не существует`,
//                 });
//             }
//
//
//         } else {
//             io.to(socket.id).emit('userMessage', {
//                 type: 'error',
//                 message: `Ошбика при получение минимальной цены`,
//             });
//         }
//
//     });
//
//     socket.on('message', (data) => {
//         console.log(`Повідомлення від клієнта з ідентифікатором сесії ${socket.id}: ${data}`);
//         io.to(socket.id).emit('message', data);
//     });
//
//     socket.on('disconnect', async () => {
//             console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLIENT '${socket?.id}' DISCONNECT IO SESSION`);
//             removeStreamPrice(socket.id)
//             deletedSocket()
//             deletedMacdSocket()
//             deletedStreamPriceSocket()
//             deletedCancelOrderSocket()
//             deletedCreatedOrderSocket()
//             await User.updateOne({token: socket.id}, {token: null})
//         }
//     );
//
// });

// function sendCallInfo(userToken, type, message) {
//     console.log('tut')
//     // Відправляємо повідомлення клієнту через сокет
//     io.to(userToken).emit('userMessage', {
//         type: type,
//         message: message
//     });
// }



module.exports = SocketIOServer;

