const WebSocket = require('ws');
const axios = require("axios");
const {TEST_BINANCE_API_DOMAIN,BINANCE_API_DOMAIN,TEST_BINANCE_SOCKET_DOMAIN,BINANCE_SOCKET_DOMAIN} = process.env

let currency = {}
let user = {}
let socketIo = ''

function streamPrice(symbol,id,type_binance) {
    try{
        console.log("ADD PRICE STREAM")
        for(const curr of symbol)
        {
            if(!currency[curr] && !user[curr]){
                let ws = new WebSocket(`wss://${type_binance ? TEST_BINANCE_SOCKET_DOMAIN : BINANCE_SOCKET_DOMAIN}/ws/${curr.toLowerCase()}@trade`);

                ws.onopen = () => {
                    console.log('Open WEB SOCKET');

                    axios.get(`https://${type_binance ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/ticker/price?symbol=${curr.toLowerCase()}`).then((response) => {
                        const p = response.data.price;

                        socketIo.emit('positionPrices', [`${curr}`,parseFloat(p)]);
                    });

                        currency[curr] = ws

                    if(user[curr])
                        user[curr] = [...user[curr], id]
                    else
                        user[curr] = [id]
                };

                ws.onmessage = event => {
                    const {p,s} = JSON.parse(event.data)
                    if(user[s] && socketIo)
                        socketIo.emit('positionPrices', [`${s}`,parseFloat(p)]);

                };

                ws.onclose = () => {
                    console.log(`Close to server ${curr}`);
                    if(user[curr]) {
                        ws = new WebSocket(`wss://fstream.binance.com/ws/${curr.toLowerCase()}@trade`);
                        currency[curr] = ws
                    }
                };

            } else{
                if(user[curr])
                    user[curr] = [...user[curr], id]
                else
                    user[curr] = [id]
            }
        }

    } catch (e){
        console.error(e)
    }
}

async function setStremPriceSocket(io) {
    if(!socketIo)
        socketIo = io
}

async function deletedStreamPriceSocket() {
    if(socketIo)
        socketIo = ''
}

async function removeStreamPrice(id) {
    function removeValueFromArray(array, value) {
        const index = array.indexOf(value);
        if (index > -1) {
            array.splice(index, 1);
        }
    }

     for (const array of Object.values(user)) {
         await removeValueFromArray(array, id);
     }

    for (let key in currency) {
        if (user[key].length === 0) {
            await currency[key].close()
            delete currency[key]
            delete user[key]
        }
    }
}


module.exports = {streamPrice,removeStreamPrice,deletedStreamPriceSocket,setStremPriceSocket}