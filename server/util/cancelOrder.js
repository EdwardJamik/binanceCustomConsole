
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const User = require("../models/user.model");
const Order = require("../models/orders.model");
const {getUserApi} = require("./getUserApi");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

let socketIo = ''
async function cancelOrder(symbol, orderId, dbId, socket) {
    try {
        let user = [], currentOrder

        if (socket?.id) {
            user = await User.findOne({token: socket?.id})
        } else if (socket) {
            currentOrder = await Order.findOne({positionsId: socket})
            user = await User.findOne({_id: currentOrder?.userId})
        }

        if (user) {
            const userApis = getUserApi(user)
            let key_1 = userApis?.key_1, key_2 = userApis?.key_2

            const timestamp = Date.now()
            const signature = getSignature(`symbol=${symbol}&orderid=${orderId}&timestamp=${timestamp}`, key_2)

            const headers = getHeaders(key_1)

            const response = await axios.delete(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?symbol=${symbol}&orderid=${orderId}&timestamp=${timestamp}&signature=${signature}`, {
                headers: headers,
            });

            if(response?.data){
                if(response?.data?.status === 'CANCELED') {
                    const updateField = {};
                    updateField[`ordersId.${response?.data?.type}`] = "";

                    await Order.updateOne({_id:dbId},{$unset: updateField})

                    const orders = await Order.find({userId: user?._id, opened: true}).sort({createdAt: -1})
                    const ordersBefore = await Order.find({userId: user?._id, opened: false}).sort({updatedAt: -1})
                    const modifiedOrders = orders.map(order => {
                        const { _id, ...rest } = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                        return { key: _id, ...rest };
                    });
                    const modifiedBeforeOrders = ordersBefore.map(order => {
                        const { _id, ...rest } = order.toObject(); // перетворення об'єкта Mongoose на звичайний об'єкт JavaScript
                        return { key: _id, ...rest };
                    });
                    socketIo.to(user?.token).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });
                    socketIo.to(user?.token).emit('updatePositionBefore', {
                        positionList: modifiedBeforeOrders,
                    });
                    socketIo.to(user?.token).emit('userMessage', {
                        type: 'success',
                        message: `${response?.data?.type} успешно отменен`
                    });
                }
            }
            return response;
        }

    } catch (error) {
        console.error(error)
        return null
    }
}

async function setCancelOrderSocket(io) {
    if(!socketIo)
        socketIo = io
}

async function deletedCancelOrderSocket() {
    if(socketIo)
        socketIo = ''
}

exports.setCancelOrderSocket = setCancelOrderSocket
exports.deletedCancelOrderSocket = deletedCancelOrderSocket
exports.cancelOrder = cancelOrder