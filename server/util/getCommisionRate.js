const {getSignature, getHeaders} = require("./signature");
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function getCommisionRate(key_1, key_2, data, user, io) {
    try {
        console.log(key_1,key_2)
        if (data) {
            const timestamp = Date.now()
            const signature = getSignature(`symbol=${data?.symbol}&timestamp=${timestamp}`, key_2)

            const headers = getHeaders(key_1)

            const response = await axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/commissionRate?symbol=${data?.symbol}&timestamp=${timestamp}&signature=${signature}`, {
                headers: headers,
            });

            const commissionTaker = parseFloat(response?.data?.takerCommissionRate)
            const commissionMaker = parseFloat(response?.data?.makerCommissionRate)

            if(io) {
                io.to(user?.token).emit('updateCommission', {commissionTaker, commissionMaker});

            }

            return {commissionTaker,commissionMaker}
        }

    } catch (error) {
        console.log(error)
    }
}

exports.getCommisionRate = getCommisionRate