const axios = require('axios');
const {getSignature} = require("./signature");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function getOrderDetails(symbol, orderId,apiKey,apiSecret,binance_test) {
    // console.log('GET ORDER ->>>>>>>>>>>>>>>>>>>>>>>>>>>>>', symbol, orderId,apiKey,apiSecret,binance_test)
    const timestamp = Date.now();
    const queryString = `symbol=${symbol}&orderId=${orderId}&timestamp=${timestamp}`;
    const signature = getSignature(queryString, apiSecret);

    try {
        if(symbol && orderId) {
            const response = await axios.get(`https://${binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/order?${queryString}&signature=${signature}`, {
                headers: {
                    'X-MBX-APIKEY': apiKey
                }
            });
            return response.data;
        } else{
            return null;
        }

    } catch (error) {
        console.error(`Ошибка при получение информации об открытой позицие ${orderId}:`, error);
        return null;
    }
}

async function getMultipleOrderDetails(orders, apiKey, apiSecret, binance_test) {

    // console.log(orders)
    const orderPromises = orders.map(async order => await getOrderDetails(order.symbol, order.orderId, apiKey, apiSecret, binance_test));

    // console.log(orderPromises)
   // return false
    try {
        const results = await Promise.all(orderPromises);
        return results.filter(order => order !== null); // Видаляємо null результати, якщо такі є
    } catch (error) {
        console.error('Помилка при отриманні деталей ордерів:', error);
        throw error;
    }
}

exports.getMultipleOrderDetails = getMultipleOrderDetails