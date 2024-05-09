const mongoose = require("mongoose");
const app = require("./server.js");
const axios = require("axios");
const crypto = require("crypto");
// const {bot} = require("./bot");
// const socket = require('./webSocket/websocket')
const { Telegraf } = require('telegraf')
require("dotenv").config();
const { BOT_TOKEN } = process.env
const PORT = process.env.PORT || 5000;
const mongoURL = process.env.MERN_DB_URL

console.log("Connecting to DB...")

// function getSignature(queryString) {
//     return crypto
//         .createHmac('sha256', process.env.BINANCE_SECRET_API_KEY)
//         .update(queryString)
//         .digest('hex');
// }
//
// async function test() {
//     const timestamp = Date.now()
//     console.log(process.env.BINANCE_SECRET_API_KEY)
//     const signature = getSignature(`symbol=BTCUSDT&timestamp=${timestamp}`)
//
//     const headers = {
//         'X-MBX-APIKEY': `fbe525efb2e659579b13a0287bbc28c358e611e4b58c77eb2fd4614a0a36d63f`,
//         'Content-Type': 'application/x-www-form-urlencoded'
//     };
//
//     try {
//         const {data} = await axios.get(`https://${process.env.BINANCE_API_DOMAIN}/fapi/v1/commissionRate?symbol=BTCUSDT&timestamp=${timestamp}&signature=${signature}`, {
//             headers: headers,
//         });
//
//         // console.log(data)
//         const commission = parseFloat(data?.takerCommissionRate)
//         console.log(commission)
//         const op = 123.6 * commission
//         console.log(op)
//         // console.log(JSON.stringify(response.data))
//
//     } catch (error) {
//         console.log(error)
//         // console.log(JSON.stringify(error))
//     }
// }
//
// test()

mongoose.connect(mongoURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        console.log("DB connection Success");
        app.listen(PORT, () => console.log(`Server running on PORT : ${PORT}`));

    })
    .catch(err => console.log(err));






const bot = new Telegraf(BOT_TOKEN)
// try{
bot.launch()
    .then(() => console.log('Bot is running'))
    .catch((err) => console.error(err));

bot.command('start', (ctx) => {
    const chat_id = ctx?.chat?.id

    ctx.replyWithHTML(`❌ Бот не подключен к вашему аккаунту!`)
});

bot.command('chat_id', (ctx) => {
    try {
        const chat_id = ctx?.chat?.id

        ctx.replyWithHTML(`Ваш chat_id: <code>${chat_id}</code>`)
    } catch (e) {
        console.log(e)
    }
});
// } catch (e){
//     console.error(e)
// }

