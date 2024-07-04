const crypto = require('crypto');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function getMultiplePrices(symbols,apiKey,apiSecret,binance_test) {
    try {
        const timestamp = Date.now();
        const queryString = `timestamp=${timestamp}`;

        const signature = crypto
            .createHmac('sha256', apiSecret)
            .update(queryString)
            .digest('hex');

        const response = await axios({
            method: 'get',
            url: `https://${binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/ticker/price`,
            params: {
                timestamp: timestamp,
                signature: signature
            },
            headers: {
                'X-MBX-APIKEY': apiKey
            }
        });

        return response.data
            .filter(item => symbols.includes(item.symbol))
            .reduce((acc, item) => {
                acc[item.symbol] = parseFloat(item.price);
                return acc;
            }, {});
    } catch (error) {
        console.error('Помилка при отриманні цін:', error);
        throw error;
    }
}

exports.getMultiplePrices = getMultiplePrices