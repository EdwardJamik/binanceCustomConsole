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
    favorite: {
        type: Array,
        default:[]
    },
    currentOption: {
        type: Object,
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