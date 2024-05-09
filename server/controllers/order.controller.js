const axios = require("axios");
const crypto = require("crypto");

require("dotenv").config();
const {BINANCE_API_KEY, BINANCE_SECRET_API_KEY} = process.env;
const {BINANCE_API_DOMAIN} = process.env;

function getSignature(queryString) {
    return crypto
        .createHmac('sha256', BINANCE_SECRET_API_KEY)
        .update(queryString)
        .digest('hex');
}

module.exports.createOrder = async (req, res, next) => {
    try {
        const { order } = req.body;

        // {
        //         symbol:`BTCUSDT`,
        //         side:'BUY', // or SELL
        //         positionSide:`LONG`, //or SHORT
        //         quantity:`0.004`,
        //         take_profit:{stopPrice:`59000`, price:`59200`}, // price is required for STOP (Not STOP_MARKET)
        //         stop_loss:{stopPrice:`58000`, price:`57900`}, // price is required for TAKE_PROFIT (Not TAKE_PROFIT_MARKET)
        //         trailing_stop_market: {callbackRate:`1`}
        // }

        // START

        let queryElements = [];

        const querySkeleton = {symbol: order?.symbol, positionSide: order?.positionSide, side: order?.side, quantity: order?.quantity};

        {
            let marketPosition = {...querySkeleton};
            marketPosition.type = 'MARKET';
            queryElements.push(marketPosition);
        }

        if(order?.stop_loss) {
            let stopLossQuery = {...querySkeleton};
            stopLossQuery.side = `SELL`;

            if(order?.stop_loss?.price) {
                stopLossQuery.type = `STOP`;
                stopLossQuery.price = order?.stop_loss?.price;
            } else {
                stopLossQuery.type = `STOP_MARKET`;
            }
            stopLossQuery.stopPrice = order?.stop_loss?.stopPrice;

            queryElements.push(stopLossQuery);
        }
        if(order?.take_profit) {
            let takeProfitQuery = {...querySkeleton};
            takeProfitQuery.side = `SELL`;
            if(order?.take_profit?.price) {
                takeProfitQuery.type = `TAKE_PROFIT`;
                takeProfitQuery.price = order?.take_profit?.price;
            } else {
                takeProfitQuery.type = `TAKE_PROFIT_MARKET`;
            }
            takeProfitQuery.stopPrice = order?.take_profit?.stopPrice;

            queryElements.push(takeProfitQuery);
        }
        if(order?.trailing_stop_market) {
            let trailingStopMarketQuery = {...querySkeleton};
            trailingStopMarketQuery.side = querySkeleton.side; // IDK what should be in trailing

            trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
            trailingStopMarketQuery.callbackRate = order?.trailing_stop_market?.callbackRate;

            queryElements.push(trailingStopMarketQuery);
        }

        let queryString = `batchOrders=${encodeURIComponent(JSON.stringify(queryElements))}&timestamp=${Date.now()}`;
        const signature = getSignature(queryString)

        const headers = {
            'X-MBX-APIKEY': BINANCE_API_KEY,
        };

        try {
            const response = await axios.post(`https://${BINANCE_API_DOMAIN}/fapi/v1/batchOrders?${queryString}&signature=${signature}`, null, {
                headers: headers,
            });

            console.log(JSON.stringify(response.data))

        } catch(error){
            console.log(JSON.stringify(error))
        }

        // END

        // const existingUser = await User.findOne({ username });
        // if (existingUser) {
        //     return res.json({ message: "Пользователь уже существует" });
        // }
        // const user = await User.create({ password, username, entree });
        res.json({ message: "Пользователя зарегистрировано", success: true });
    } catch (error) {
        console.error(error);
    }
};

async function getAccountInfo() {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = getSignature(queryString)

    try {
        const response = await axios.get(`https://${BINANCE_API_DOMAIN}/fapi/v2/account?${queryString}&signature=${signature}`, {
            headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
        });

        return response.data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function getLeverage(symbol) {
    try {
        let positions = (await getAccountInfo()).positions;

        for(let i = 0; i < positions.length; ++i) {
            if(positions[i].symbol === symbol) {
                return positions[i]?.leverage;
            }
        }
    } catch (error) {
        console.error(error);
    }

}
async function setLeverage(symbol, leverage) {
    const queryString = `symbol=${symbol}&leverage=${leverage}&timestamp=${Date.now()}`;
    const signature = getSignature(queryString)

    try {
        const response = await axios.post(`https://${BINANCE_API_DOMAIN}/fapi/v1/leverage?${queryString}&signature=${signature}`,
            {}, {
                headers: { 'X-MBX-APIKEY': BINANCE_API_KEY,
                    'Content-Type': 'application/x-www-form-urlencoded' }
            });
    } catch (error) {
        console.error(error);
    }
}
