const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique:true
    },
    password: {
        type: String,
    },
    api_key: {
        type: String,
    },
    api_secret_key: {
        type: String,
    },
    chat_id: {
        type: String,
    },
    binance_test: {
        type: Boolean,
        default:true
    },
    token: {
        type: String,
        default:null
    },
    symbol: {
        type: String,
        default:'BTCUSDT'
    },
    currentOption: {
        type: Object,
        default: {
            'BTCUSDT': {
                amount: '0',
                adjustLeverage: '2',
                currencyPrice: 0,
                takeProfit: {
                    price: 0,
                    procent: false
                },
                trailing: {
                    price: 0,
                    procent: false
                },
                macd: {
                    type: 'LONG',
                    number: 2,
                    timeFrame: '5m'
                },
                withoutLoss: {
                    price: 0,
                    procent: false
                }
            }
        }
    },
    updatedAt: {
        type: Date,
        default: new Date(),
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
},{ timestamps: true })

module.exports = mongoose.model("Users", userSchema);