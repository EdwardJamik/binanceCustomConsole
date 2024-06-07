const axios = require("axios");
const {getHeaders, getSignature} = require("./signature");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function getAvailableBalance(key_1, key_2, user) {

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = getSignature(queryString, key_2)
    const headers = getHeaders(key_1)

    let balance = []

    try {
        const response = await axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/balance?${queryString}&signature=${signature}`,
            { headers });

        for (const asset of response.data) {
            if(parseFloat(asset?.availableBalance) > 0)
                balance.push({ value: `${asset.asset}`, label: `${parseFloat(asset?.availableBalance).toFixed(2)} ${(asset.asset).toLowerCase()}` });
        }

        return balance


    } catch (error) {
        console.error(error)
        return undefined
    }
}

module.exports.getAvailableBalance = getAvailableBalance