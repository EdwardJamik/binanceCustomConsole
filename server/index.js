const mongoose = require("mongoose");
const {app} = require("./server.js");
const User = require('./models/user.model')
const Order = require("./models/orders.model");
const {createEventsSocket} = require("./webSocket/binance.event.socket");

const {bot} = require("./bot");
const {getUserApi} = require("./util/getUserApi");

require("dotenv").config();
const { BOT_TOKEN } = process.env
const PORT = process.env.PORT || 5000;


const mongoURL = process.env.MERN_DB_URL

console.log("Connecting to DB...")

mongoose.connect(mongoURL)
    .then(async () => {
        console.log("DB connection Success");
        app.listen(PORT, () => console.log(`Server running on PORT : ${PORT}`));
        bot.launch().then(() => console.log('Bot is running')).catch((err) => console.error(err));

        const checkSocketPriceOrders = await Order.findOne({opened: true})
        if (checkSocketPriceOrders) {
            const user = await User.findOne({_id: checkSocketPriceOrders?.userId})
            const userApis = getUserApi(user)
            console.log('START APPS ON EVENT: ', user?._id, userApis?.key_1, userApis?.key_2)
            createEventsSocket(user?.binance_test, userApis?.key_1, userApis?.key_2)
        }

    })
    .catch(err => console.log(err));

