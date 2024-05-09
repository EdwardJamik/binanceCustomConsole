// const WebSocket = require('ws');
//
// function streamPrice(symbol) {
//     try{
//         const ws = new WebSocket(`wss://fstream.binance.com/ws/btcusdt@markPrice@1s`);
//
//         ws.on('open', function open() {
//             // allowTrade[`${symbol}@${interval}`] = true
//             console.log(`connected`);
//         });
//
//         ws.on('close', function close() {
//             console.log(`disconnected:`);
//             // if (sockets[`${id}`]) {
//             //     console.log(`RECONNECT: ${id}`);
//                 // addSocket(id,symbol, interval)
//             // }
//         });
//
//         ws.on('message', function incoming(msg) {
//             try {
//                 const {p} = JSON.parse(msg)
//                 // console.log(JSON.parse(msg))
//                 console.log(p)
//
//             } catch (e){
//                 console.error(e)
//             }
//         });
//
//
//         // sockets[`${id}`] = ws;
//     } catch (e){
//         console.error(e)
//     }
// }
//
// streamPrice()