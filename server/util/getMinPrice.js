const axios = require("axios");
const User = require("../models/user.model");
const {getLeverage} = require("./getLeverage");
const {getLeverageBracket} = require("./getLeverageBracket");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN} = process.env

async function getMinimumBuyQuantity(symbol, socket, key_1, key_2) {
    try {

        const user = await User.findOne({token: socket.id})
        const exchangeInfoResponse = await axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v1/exchangeInfo`);
        const symbolInfo = exchangeInfoResponse.data.symbols.find(s => s.symbol === symbol);

        if (!symbolInfo) {
            throw new Error(`Symbol ${symbol} not found`);
        }

        const minNotional = parseFloat(symbolInfo.filters.find(f => f.filterType === 'MIN_NOTIONAL').notional);
        const lotSizeFilter = symbolInfo.filters.find(f => f.filterType === 'LOT_SIZE');
        const minQty = parseFloat(lotSizeFilter.minQty);
        const stepSize = parseFloat(lotSizeFilter.stepSize);

        const currentPrice = await getCurrentPrice(symbol)
        let minimumQuantity = Math.max(minNotional / currentPrice, minQty);


        minimumQuantity = Math.ceil(minimumQuantity / stepSize) * stepSize;
        const response = await getLeverage(key_1, key_2, {symbol: symbol}, user)
        const maxAdjustLeverage = await getLeverageBracket(key_1,key_2,{symbol: user.symbol}, user)

        minimumQuantity = minimumQuantity/(response)

        return {minimumQuantity,response,maxAdjustLeverage}
    } catch (error) {
        console.error(error?.data)
        // return undefined
    }
}

async function getCurrentPrice(symbol, test) {
    try {
        const response = await axios.get(`https://${test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/ticker/price?symbol=${symbol}`);
        return parseFloat(response.data.price)
    } catch(error) {
        console.error(error)
        // return undefined
    }
}

exports.getMinimumBuyQuantity = getMinimumBuyQuantity