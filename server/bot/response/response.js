module.exports = async bot => {


    bot.command('start', (ctx) => {
        const chat_id = ctx?.chat?.id

        // ctx.replyWithHTML(`❌ Бот не подключен к вашему аккаунту!`)
    });

    bot.on('chat_id', (ctx) => {
        try {
            const chat_id = ctx?.update?.my_chat_member?.chat?.id

            ctx.replyWithHTML(`Ваш chat_id: <code>${chat_id}</code>`)
        } catch (e) {
            console.log(e)
        }
    });
};