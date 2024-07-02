const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model.js");
const {getSignature, getHeaders} = require("../util/signature");
const {v4: uuidv4} = require("uuid");
const { TOKEN_BINANCE_KEY,BINANCE_API_DOMAIN, TEST_BINANCE_API_DOMAIN } = process.env

module.exports.getCurrency = async (req, res, next) => {
    try {

        const listPair = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo')

        const pairs = listPair?.data?.symbols
            .filter(pair => pair.status === 'TRADING')
            .map(pair => ({label: pair.symbol, value: pair.symbol}));

        res.json({pairs: pairs});
    } catch (error) {
        console.error(error);
    }
};

module.exports.getEditorCurrency = async (req, res, next) => {
    try {
        const {TOKEN_KEY} = process.env

        const token = req.cookies.token

        if (!token) {
            return res.json({status: false, message: 'Пользователя не найдено'})
        }

        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const {favorite} = await User.findOne({_id: data.id}, {favorite: 1});

                const listPair = await axios.get('https://fapi.binance.com/fapi/v1/exchangeInfo')

                const pairs = listPair?.data?.symbols
                    .filter(pair => pair.status === 'TRADING')
                    .map(pair => ({ label: pair.symbol, value: pair.symbol }));

                let listFavorite = []

                if(favorite?.length)
                    listFavorite = favorite.map(pair => ({label: pair.name, value: pair.id}));

                res.json({pairs:pairs,favorite:listFavorite});
            }
        });
    } catch (error) {
        console.error(error);
    }
};

module.exports.getFavoriteList = async (req, res, next) => {
    try {
        const {TOKEN_KEY} = process.env
        const {id} = req.body

        const token = req.cookies.token

        if (!token) {
            return res.json({status: false, message: 'Пользователя не найдено'})
        }

        jwt.verify(token, TOKEN_KEY, async (err, data) => {
            if (err) {
            } else {
                const {favorite} = await User.findOne({_id: data.id}, {favorite: 1});

                const listFavorite = favorite.filter(pair => pair.id === id).map(pair => pair);

                if(listFavorite?.length)
                    res.json({name:listFavorite[0]?.name,list:listFavorite[0]?.list});
            }
        });
    } catch (error) {
        console.error(error);
    }
};

module.exports.createNewCurrency = async (req, res, next) => {
    try {
        const {TOKEN_KEY} = process.env
        const {name, list, newFavorite, id} = req.body;
        const token = req.cookies.token

        if (!token) {
            return res.json({status: false, message: 'Пользователя не найдено'})
        }

        if(!newFavorite){
            if(name === '' && name.length)
                return res.json({status: false, message: 'Укажите название для нового списка избранных'})
            if(!list.length)
                return res.json({status: false, message: 'Укажите название для нового списка избранных'})

            jwt.verify(token, TOKEN_KEY, async (err, data) => {
                if (err) {
                } else {
                    const {favorite} = await User.findOne({_id: data.id}, {favorite: 1});

                    let updatedUser;
                    const id = uuidv4()
                    if (favorite?.length) {
                        updatedUser = await User.findOneAndUpdate(
                            {_id: data.id},
                            {$push: {favorite: {id, name, list}}},
                            {new: true}
                        );
                    } else {
                        updatedUser = await User.findOneAndUpdate(
                            {_id: data.id},
                            {favorite: [{id, name, list}]},
                            {new: true}
                        );
                    }

                    const pairs = updatedUser.favorite
                        .map(pair => ({label: pair.name, value: pair.id}));

                    res.json({status: true, message: 'Новый список избранных успешно создано', value: pairs});
                }
            });
        } else {

            jwt.verify(token, TOKEN_KEY, async (err, data) => {
                if (err) {
                } else {
                    const {favorite} = await User.findOne({_id: data.id}, {favorite: 1});
                    const updateObjectInArray = (array, id, newName, newList) => {
                        return array.map(obj =>
                            obj.id === id
                                ? { ...obj, name: newName, list: newList }
                                : obj
                        );
                    };

                    const updatedArray = updateObjectInArray(favorite, id, name, list);

                    const updatedUser = await User.findOneAndUpdate(
                        {_id: data.id},
                        {favorite: [...updatedArray]},
                        {new: true}
                    );

                    const pairs = updatedUser?.favorite?.map(pair => ({label: pair.name, value: pair.id}));

                    res.json({status: true, message: 'Изменения успешно внесены',value: pairs});
                }
            });

        }

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
