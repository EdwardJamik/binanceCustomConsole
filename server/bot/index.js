const { Telegraf, Scenes } = require('telegraf')
require('dotenv').config()

const { BOT_TOKEN } = process.env
// const response = require('./response/response')
console.log('tut')
console.log(BOT_TOKEN)
const bot = new Telegraf(`${BOT_TOKEN}`)
// try{
    bot.command('start', (ctx) => {
        const chat_id = ctx?.chat?.id

        // ctx.replyWithHTML(`❌ Бот не подключен к вашему аккаунту!`)
    });

    bot.on('chat_id', (ctx) => {
        try {
            console.log('tut')
            const chat_id = ctx?.update?.my_chat_member?.chat?.id

            ctx.replyWithHTML(`Ваш chat_id: <code>${chat_id}</code>`)
        } catch (e) {
            console.log(e)
        }
    });
// } catch (e){
//     console.error(e)
// }

module.exports = {bot}
