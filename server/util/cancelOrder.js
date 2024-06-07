
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const User = require("../models/user.model");
const Order = require("../models/orders.model");
const {getUserApi} = require("./getUserApi");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env
const socketServer = require("../server");
const {getAvailableBalance} = require("./getBalance");

async function cancelOrder(symbol, orderId, dbId, id) {
    try {
        let user = [], currentOrder

        if (id) {
            user = await User.findOne({token: id})
        } else if (id) {
            currentOrder = await Order.findOne({positionsId: id})
            user = await User.findOne({_id: currentOrder?.userId})
        }

        if (user) {
            const userApis = getUserApi(user)

            const timestamp = Date.now()
            const signature = getSignature(`symbol=${symbol}&orderid=${orderId}&timestamp=${timestamp}`, userApis?.key_2)

            const headers = getHeaders(userApis?.key_1)

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

                    socketServer.socketServer.io.to(id).emit('updatePositionCreated', {
                        positionList: modifiedOrders,
                    });

                    socketServer.socketServer.io.to(id).emit('updatePositionBefore', {
                        positionList: modifiedBeforeOrders,
                    });
                    socketServer.socketServer.io.to(id).emit('userMessage', {
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

exports.cancelOrder = cancelOrder