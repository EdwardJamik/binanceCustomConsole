const { Telegraf, Scenes } = require('telegraf')
require('dotenv').config()
const Auth = require("../models/auth.model");
const socketServer = require("../server");
const {createSecretToken} = require("../util/secretToken");

const { BOT_TOKEN } = process.env
const bot = new Telegraf(`${BOT_TOKEN}`)

try{

    bot.command('start', (ctx) => {
        ctx.replyWithHTML(`❌ Бот не подключен к вашему аккаунту!`)
    });

    bot.command('chat_id', (ctx) => {
        try {
            console.log('tut')
            const chat_id = ctx?.chat?.id

            ctx.replyWithHTML(`Ваш chat_id: <code>${chat_id}</code>`)
        } catch (e) {
            console.log(e)
        }
    });

    bot.on('callback_query', async (ctx) => {
        try {
            const chat_id = ctx?.update?.callback_query?.from?.id
            const callback = ctx?.update?.callback_query?.data
            let callback_parts = callback?.split('_');
            let result_key = callback_parts[1] ? callback_parts[1] : false;

            if (callback_parts[0] === 'accept') {
                const findAuth = await Auth.findOne({chat_id,key:result_key, status:null})
                if(findAuth){
                    const token = createSecretToken(findAuth?.user_id)
                    socketServer.socketServer.io.to(result_key).emit('cookie-set', {token});
                    ctx.deleteMessage().catch(()=>{})
                    await Auth.updateOne({chat_id,key:result_key},{status:true})
                }
            } else if(callback_parts[0] === 'decline'){
                const findAuth = await Auth.findOne({chat_id,key:result_key, status:null})
                if(findAuth){
                    ctx.deleteMessage().catch(()=>{})
                    await Auth.updateOne({chat_id,key:result_key, status:null}, {status: false})
                }
            }

        } catch (e){
            console.error(e)
        }
    });

} catch (e){
    console.error(e)
}

module.exports = {bot}
