const { Server } = require("socket.io");
const http = require("http");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const User = require('../models/user.model')
const Order = require('../models/orders.model')
const PreSetting = require('../models/presetting.model')
const {getSignature, getHeaders} = require("../util/signature");
const axios = require("axios");
const {removeStreamPrice, removeInstrument, streamPrice} = require("./binance.price.socket");
const {getMinimumBuyQuantity} = require("../util/getMinPrice");
const {getUserApi} = require("../util/getUserApi");

const {createOrder} = require("../util/createOrder");
const {cancelOrder} = require("../util/cancelOrder");
const getAuthentificate = require("../util/getAuthentificate");
const socketServer = require("../server");
const {getCommisionRate} = require("../util/getCommisionRate");
const {getAvailableBalance} = require("../util/getBalance");
const {setUserToken} = require("../util/setUserToken");
const {createEventsSocket} = require("./binance.event.socket");

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

            socket.on('authenticate', async ({ token, type }) => {

                try {
                    await getAuthentificate(token, socket.id)
                    const {_id} = await User.findOne({token: socket.id})
                    if (_id)
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



            socket.on('addPreSettingItem', async ({name}) => {

                if(name !== 'custom' && name && name !== ' '){
                    const user = await User.findOne({token: socket?.id})

                    const findPresset = await PreSetting.findOne({ user_id: user?._id, name})

                    if(findPresset){
                        await PreSetting.deleteOne({user_id: user?._id, name})

                        const findAllPreSetting = await PreSetting.distinct('name',{user_id: user?._id})
                        await User.updateOne({_id:user?._id},{preSetting: 'custom'})

                        socketServer.socketServer.io.to(String(user?._id)).emit('userData', {preSetting: [...findAllPreSetting] , selectedPreSetting: 'custom'});
                        socketServer.socketServer.io.to(String(user?._id)).emit('userMessage', {
                            type: 'success',
                            message: `Пресет успешно удален`,
                        });
                    } else {
                        await PreSetting.create({
                            user_id: user?._id,
                            name,
                            adjustLeverage: user?.currentOption?.adjustLeverage,
                            takeProfit: user?.currentOption?.takeProfit,
                            trailing: user?.currentOption?.trailing,
                            macd: user?.currentOption?.macd,
                            withoutLoss: user?.currentOption?.withoutLoss,
                        })
                        await User.updateOne({_id:user?._id},{preSetting: name})
                        const findAllPreSetting = await PreSetting.distinct('name',{user_id: user?._id})

                        socketServer.socketServer.io.to(String(user?._id)).emit('userData', {preSetting: [...findAllPreSetting] , selectedPreSetting: name});
                        socketServer.socketServer.io.to(String(user?._id)).emit('userMessage', {
                            type: 'success',
                            message: `Пресет успешно создан`,
                        });
                    }
                } else {
                    socketServer.socketServer.io.to(socket?.id).emit('userMessage', {
                        type: 'error',
                        message: `Ошибка не верно указано имя`,
                    });
                }
            });

            socket.on('changePreSetting', async ({name}) => {
                    const user = await User.findOne({token: socket?.id})

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

                    const findPresset = await PreSetting.findOne({ user_id: user?._id, name},{_id:0,updatedAt:0,createdAt:0})

                    if(findPresset){

                        let userData = {currentOption:
                                {
                                    adjustLeverage: findPresset?.adjustLeverage,
                                    takeProfit: findPresset?.takeProfit,
                                    trailing:findPresset?.trailing,
                                    macd:findPresset?.macd,
                                    withoutLoss:findPresset?.withoutLoss,
                                    amount:findPresset?.amount
                                }
                        }
                        const userApis = getUserApi(user)

                        const minPrice = await getMinimumBuyQuantity(user?.symbol, socket?.id, userApis?.key_1, userApis?.key_2)
                        const commission = await getCommisionRate(userApis?.key_1, userApis?.key_2, {symbol: user?.symbol}, user)
                        const balance = await getAvailableBalance(userApis?.key_1, userApis?.key_2, user)

                        if(!minPrice?.response || parseInt(minPrice?.response) !== parseInt(findPresset?.adjustLeverage)){

                            const timestamp = Date.now()
                            const signature = getSignature(`symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}`, userApis?.key_2)
                            const headers = getHeaders(userApis?.key_1)
                            axios.post(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/leverage?symbol=${user?.symbol}&leverage=${data?.value}&timestamp=${timestamp}&signature=${signature}`, {},{headers}).then(async (response) => {
                                if (response.data.leverage) {
                                    const minPrice = await getMinimumBuyQuantity(user.symbol, socket.id, userApis?.key_1, userApis?.key_2)
                                    if(user?.currentOption){
                                        userData = {
                                            currentOption: {
                                                ...userData?.currentOption,
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
                                                ...userData?.currentOption,
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
                        }

                        userData = {
                            ...userData,
                            symbol: user.symbol,
                            isAuthenticated: true,
                            commission: commission,
                            balance,
                            selectedPreSetting: name,
                            type_binance: user?.binance_test,
                            currentOption: {
                                ...userData?.currentOption,
                                amount: roundDecimbal(`${minPrice?.minimumQuantity}`),
                                adjustLeverage: minPrice?.response,
                                minCurrencyPrice: minPrice?.minimumQuantity,
                                maxAdjustLeverage: minPrice?.maxAdjustLeverage
                            }
                        }

                        await User.updateOne({_id: user?._id},{preSetting: name, currentOption:userData?.currentOption})

                        socketServer.socketServer.io.to(String(user?._id)).emit('userData', {...userData});
                        socketServer.socketServer.io.to(String(user?._id)).emit('userMessage', {
                            type: 'success',
                            message: `Пресет успешно переключен`,
                        });
                    } else {
                        await User.updateOne({_id: user?._id},{preSetting: 'custom'})
                        socketServer.socketServer.io.to(String(user?._id)).emit('userData', {selectedPreSetting:'custom'});
                        socketServer.socketServer.io.to(String(user?._id)).emit('userMessage', {
                            type: 'success',
                            message: `Пресет отключен`,
                        });
                    }
            });

            socket.on('createOrder', async (data) => {

                const user = await User.findOne({token: socket?.id})

                createOrder(data, user, String(user?._id))
            });

            socket.on('setLeverage', async (data) => {
                let userData = {}

                if (data.value >= 1) {
                    socketServer.socketServer.io.to(socket.id).emit('userData', {isOpened:false});

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

                                this.io.to(socket.id).emit('userData', {...userData, isOpened: true});

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
                        this.io.to(socket.id).emit('userData', {isOpened: false});

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

                                    this.io.to(socket.id).emit('userData', {...userData, isOpened: true});

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

                                    this.io.to(socket.id).emit('userData', {...userData, isOpened: true});

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

                                this.io.to(socket.id).emit('userData', {...userData, isOpened: true});

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

