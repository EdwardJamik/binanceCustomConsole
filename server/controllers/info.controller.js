const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const {getSignature, getHeaders} = require("../util/signature");
const { TOKEN_BINANCE_KEY,BINANCE_API_DOMAIN, TEST_BINANCE_API_DOMAIN } = process.env

module.exports.getCurrency = async (req, res, next) => {
    try {

        axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo').then((response)=>{
            if (response.data && response.data.symbols) {
                const pairs = response.data.symbols
                    .filter(pair => pair.status === 'TRADING')
                    .map(pair => ({ label: pair.symbol, value: pair.symbol }));
                res.json({pairs:pairs});
            } else {
                res.json({pairs:false});
                console.log('Отримання валютних пар не вдалося.');
            }

            // pair.symbol.endsWith('USDT') &&
        }).catch((e)=>{
            console.error(e)
        });
    } catch (error) {
        console.error(error);
    }
};

module.exports.getCurrencyLeverage = async (req, res) => {
    try{
        const { TOKEN_KEY } = process.env
        const { symbol } = req.body;

        const token = req.cookies.token

        if (!token) {
            return res.json({ status: false, message: 'User not found'  })
        }

        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const user = await User.findById(data.id)
                if (user) {
                    let key_1 = ``, key_2 = ``
                    if(user.api_key)
                        jwt.verify(user.api_key, TOKEN_BINANCE_KEY, async (err, data) => {
                            if (err) {
                            } else {
                                key_1 = data
                            }
                        })

                    if(user.api_key)
                        jwt.verify(user.api_secret_key, TOKEN_BINANCE_KEY, async (err, data) => {
                            if (err) {
                            } else {
                                key_2 = data
                            }
                        })

                    const timestamp = Date.now()
                    const signature = getSignature(`symbol=${symbol}&timestamp=${timestamp}`, key_2)
                    const headers = getHeaders(key_1)

                    axios.get(`https://${user?.binance_test ? TEST_BINANCE_API_DOMAIN : BINANCE_API_DOMAIN}/fapi/v2/positionRisk?symbol=${symbol}&timestamp=${timestamp}&signature=${signature}`,  {headers}).then(({data})=>{
                        if (data) {
                            console.error(`Error: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.\\n at /Users/x/projects/x-workstation/x/binance/node_modules/binance-api-node/dist/http.js:47:19\\n at process._tickCallback (internal/process/next_tick.js:68:7)`)
                            return res.json({status: true, leverage: data[1].leverage});
                        } else {
                            res.json({status:false, message: 'Ошибка: Не удалось получить кредитное плечо' });
                        }
                    }).catch((e)=>{
                        console.error(e)
                    });

                }
                else {
                    res.json({status:false, message: 'Ошибка: Не удалось идентифицировать пользователя' });
                }
            }
        })
    } catch (e){
        console.error(e)
    }
};
