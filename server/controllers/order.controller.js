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
        //         take_profit:{
        //              stopPrice:`58000`, -  відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
        //              percent: false - false - це точна сума, true - в вісотках
        //         }, // price is required for STOP (Not STOP_MARKET)
        //         stop_loss:{
        //              stopPrice:`58000`, -  відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
          //            percent: false - false - це точна сума, true - в вісотках
        //         }, // price is required for TAKE_PROFIT (Not TAKE_PROFIT_MARKET)
        //         trailing_stop_market: {
        //              callbackRate:`1` - відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
        //              percent: false - false - це точна сума, true - в вісотках
        //         },
                // macd:{
                //     type:'LONG',
                //         number:2,
                //         timeFrame:'5m'
                // },
                // withoutLoss:{
                //     price:0,
                //         percent:false
                // }
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
            stopLossQuery.type = `STOP_MARKET`;
            if(order?.stop_loss?.percent) {
                const percentPrice = (order?.stop_loss?.currentPrice * order?.stop_loss?.stopPrice) / 100;
                if(order?.positionSide === 'LONG') {
                    stopLossQuery.stopPrice = order?.stop_loss?.currentPrice - percentPrice;
                } else if(order?.positionSide === 'SHORT') {
                    stopLossQuery.stopPrice = Number(order?.stop_loss?.currentPrice) + percentPrice;
                }
            } else {
                stopLossQuery.stopPrice = order?.stop_loss?.stopPrice;
            }
            queryElements.push(stopLossQuery);
        }
        if(order?.take_profit) {
            let takeProfitQuery = {...querySkeleton};
            takeProfitQuery.side = `SELL`;
            takeProfitQuery.type = `TAKE_PROFIT_MARKET`;
            if(order?.take_profit?.percent) {
                const percentPrice = (order?.take_profit?.currentPrice * order?.take_profit?.stopPrice) / 100;
                if(order?.positionSide === 'LONG') {
                    takeProfitQuery.stopPrice = Number(order?.take_profit?.currentPrice) + percentPrice;
                } else if(order?.positionSide === 'SHORT') {
                    takeProfitQuery.stopPrice = order?.take_profit?.currentPrice - percentPrice;
                }
            } else {
                takeProfitQuery.stopPrice = order?.take_profit?.stopPrice;
            }
            queryElements.push(takeProfitQuery);
        }
        if(order?.trailing_stop_market) {
            let trailingStopMarketQuery = {...querySkeleton};
            trailingStopMarketQuery.side = querySkeleton.side; // IDK what should be in trailing

            trailingStopMarketQuery.type = `TRAILING_STOP_MARKET`;
            if(order?.trailing_stop_market?.percent) {
                trailingStopMarketQuery.callbackRate = order?.trailing_stop_market?.callbackRate;
            } else {
                trailingStopMarketQuery.callbackRate = (order?.trailing_stop_market?.callbackRate / order?.trailing_stop_market?.currentPrice) * 100;
            }

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
