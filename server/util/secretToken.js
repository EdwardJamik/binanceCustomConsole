require("dotenv").config();
const jwt = require("jsonwebtoken");

const { TOKEN_KEY, TOKEN_BINANCE_KEY } = process.env

module.exports.createSecretToken = (id) => {
    return jwt.sign({ id }, TOKEN_KEY, {
        expiresIn: 3 * 24 * 60 * 60,
    });
};

module.exports.createBinanceSecretToken = (token) => {
    return jwt.sign( token , TOKEN_BINANCE_KEY, );
};