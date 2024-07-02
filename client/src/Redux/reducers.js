
const initialState = {
    isAuthenticated: null,
    isTypePosition:'LONG',
    positions:[],
    positionsBefore:[],
    socketPrice:[],
    symbol:null,
    trailing:null,
    withoutLoss:null,
    type_binance:null,
    balance:{'USDT':0},
    currentSocketPrice: {
        current:null,
        other:[null]
    },
    favorite:[],
    positionPrice:{},
    commission:{commissionTaker:null,commissionMaker:null},
    currentOption: {
        minCurrencyPrice: 100,
        amount: "0",
        adjustLeverage:"2",
        maxAdjustLeverage:"100",
        currencyPrice: 0,
        takeProfit:{
            status:false,
            price:0,
            procent:false
        },
        trailing:{
            status:false,
            price:0,
            procent:false
        },
        macd:{
            status:false,
            type: "long",
            type_g: "long",
            number:2,
            timeFrame:"5m"
        },
        withoutLoss:{
            status:false,
            price:0,
            procent:false
        }
    }
};

const authenticationReducer = (state = initialState, action) => {
    switch (action.type) {
        case 'SET_AUTHENTICATION_STATUS':
            return {
                ...state,
                isAuthenticated: action.payload,
            };
            break
        case 'SET_TRAILING_DATA':
            return {
                ...state,
                trailing: action.payload,
            }
            break
        case 'SET_WITHOUTLOSS_DATA':
            return {
                ...state,
                withoutLoss: action.payload,
            }
            break
        case 'SET_POSITION_TYPE':
            return {
                ...state,
                isTypePosition: action.payload,
            };
            break
        case 'SET_FAVORITE':
            return {
                ...state,
                favorite:action.payload,
            }
            break
        case 'FILTERED_CURRENCY':
            return {
                ...state,
                symbol:action.payload,
                currentOption: {
                    ...state.currentOption,
                }
            }
            break
        case 'FILTERED_COMMISSION':
            return {
                ...state,
                commission:action.payload,
            }
            break
        case 'FILTERED_BALANCE':
            return {
                ...state,
                balance: action.payload,
            }
            break
        case 'FILTERED_MACD':
            return {
                ...state,
                currentOption: {
                    ...state.currentOption,
                    macd:{
                        ...state.currentOption.macd,
                        ...action.payload,
                    }
                }
            }
            break
        case 'SET_SYMBOL':
            return {
                ...state,
                symbol: action.payload,
            }
            break
        case 'FILTERED_CURRENCY_PRICE':
            return {
                ...state,
                currentOption: {
                    ...state.currentOption,
                    minCurrencyPrice: action.payload,
                }
            }
            break
        case 'FILTERED_POSITION':
            return {
                ...state,
                positions: [
                    ...state.positions,
                    ...action.payload,
                ]
            }
            break
        case 'FILTERED_POSITION_BEFORE':
            return {
                ...state,
                positionsBefore: [
                    ...action.payload,
                ]
            }
            break
        case 'CURRENT_POSITION':
            return {
                ...state,
                positions: [
                    ...action.payload,
                ]
            }
            break
        case 'SET_TYPE_BINANCE':
            return {
                ...state,
                type_binance: action.payload,
            }
            break
        case 'FILTERED_POSITION_PRICE':
            return {
                ...state,
                positionPrice:
                    {...action.payload},

            }
            break
        case 'SET_LEVERAGE':
            return {
                ...state,
                currentOption: {
                    ...state.currentOption,
                    adjustLeverage: action.payload,
                }
            };
            break
        case 'SET_SIZE':
            return {
                ...state,
                currentOption: {
                    ...state.currentOption,
                    amount: action.payload,
                }
            };
            break
        case 'SET_USER_DATA':
            return {
                ...state,
                ...action.payload,
                currentOption:{
                    ...state.currentOption,
                    ...action.payload.currentOption
                 }
            };
            break
        default:
            return state;
    }
};

export default authenticationReducer;
