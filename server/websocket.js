const axios = require('axios')
const {BINANCE_API_KEY, BINANCE_SECRET_API_KEY} = process.env;
const {BINANCE_API_DOMAIN, BINANCE_SOCKET_DOMAIN} = process.env;

async function createListenKey() {
    console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CREATE LISTEN KEY`)
    const headers = {
        'X-MBX-APIKEY': BINANCE_API_KEY,
    };

    try {
        const response = await axios.post(`https://${BINANCE_API_DOMAIN}/fapi/v1/listenKey`, null, {
            headers: headers,
        });
        return response;
    } catch(error){
        console.log(error);
        return null;
    }
}

async function extendListenKey() {
    const headers = {
        'X-MBX-APIKEY': BINANCE_API_KEY,
    };

    try {
        const response = await axios.put(`https://${BINANCE_API_DOMAIN}/fapi/v1/listenKey`, null, {
            headers: headers,
        });
        return response;
    } catch(error){
        console.error(error);
        return null;
    }
}

async function deleteListenKey() {
    const headers = {
        'X-MBX-APIKEY': BINANCE_API_KEY,
    };

    try {
        const response = await axios.delete(`https://${BINANCE_API_DOMAIN}/fapi/v1/listenKey`, {
            headers: headers,
        });
        return response;
    } catch(error){
        console.log(error);
        return null;
    }
}

async function startOrderUpdate() {
    let listenKey = (await createListenKey()).data.listenKey;
    try {
        const ws = new WebSocket(`wss://${BINANCE_SOCKET_DOMAIN}/ws/${String(listenKey)}`);

        let intervalID;
        ws.on('open', function open() {
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] START MONITORING ORDERS UPDATES`)
            intervalID = setInterval(extendListenKey, 3300000); // 3.300.000 = 55 minutes
        });

        ws.on('close', function close() {
            console.log(`[${new Date().toLocaleTimeString('uk-UA')}] CLOSE MONITORING ORDERS UPDATES`)
            clearInterval(intervalID);
            startOrderUpdate();
        });


        ws.on('message', async function incoming(data) {
            try {
                /*
                    All events:
                        CONDITIONAL_ORDER_TRIGGER_REJECT
                        GRID_UPDATE
                        STRATEGY_UPDATE
                        ACCOUNT_CONFIG_UPDATE
                        ORDER_TRADE_UPDATE
                        ACCOUNT_UPDATE
                        MARGIN_CALL
                        listenKeyExpired - check for listenKeyExpired and extend the key
                */
                const parsedData = JSON.parse(data);
                const { e } = parsedData; // e - event type
                console.log(parsedData)
            } catch (e) {
                console.error(`${JSON.stringify(e)}`);
            }
        });

    } catch (e) {
        console.error(`${JSON.stringify(e)}`);
    }
}
