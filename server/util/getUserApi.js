const jwt = require("jsonwebtoken");
const {TOKEN_BINANCE_KEY} = process.env

function getUserApi(user){
    try{
        let key_1, key_2
        if (user?.api_key)
            jwt.verify(user?.api_key, TOKEN_BINANCE_KEY, async (err, data) => {
                if (err) {
                } else {
                    key_1 = data
                }
            })

        if (user?.api_key)
            jwt.verify(user?.api_secret_key, TOKEN_BINANCE_KEY, async (err, data) => {
                if (err) {
                } else {
                    key_2 = data
                }
            })


        return {key_1,key_2}
    } catch (e){
        console.error(e)
    }
}

exports.getUserApi = getUserApi