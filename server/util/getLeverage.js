const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

function getLeverage(key_1,key_2,data,user){

    const timestamp = Date.now()
    const signature = getSignature(`symbol=${data.symbol}&timestamp=${timestamp}`, key_2)
    const headers = getHeaders(key_1)
    const leverage = axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/positionRisk?symbol=${data.symbol}&timestamp=${timestamp}&signature=${signature}`, {headers}).then((response) => {
        if (response.data[1].leverage) {
            return parseFloat(response.data[1].leverage)
        } else {
            return false
        }
    }).catch((e) => {
        // console.error(e)
        // return false
    });

    return leverage
}

exports.getLeverage = getLeverage