// /fapi/v1/leverageBracket
const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

function getLeverageBracket(key_1,key_2,data,user){

    const timestamp = Date.now()
    const signature = getSignature(`symbol=${data.symbol}&timestamp=${timestamp}`, key_2)
    const headers = getHeaders(key_1)
    const leverage = axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/leverageBracket?symbol=${data.symbol}&timestamp=${timestamp}&signature=${signature}`, {headers}).then((response) => {
        if (response) {
            return response.data[0].brackets[0].initialLeverage
        } else {
            return false
        }
    }).catch((e) => {
        console.error(e)
        return false
    });

    return leverage
}

exports.getLeverageBracket = getLeverageBracket
