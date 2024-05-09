import {fetchAuthenticationStatus} from "./actions.js";

const initialState = {
    user: {
        isAuthenticated: await fetchAuthenticationStatus(),
    },
    currentOption: {
        currency: 'BTCUSDT',
        amount: '0',
        adjustLeverage:'2',
        currencyPrice: 0,
        takeProfit:{
            price:0,
            procent:false
        },
        trailing:{
            price:0,
            procent:false
        },
        macd:{
            type:'LONG',
            number:2,
            timeFrame:'5m'
        },
        withoutLoss:{
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
                user: {
                    ...state.user,
                    isAuthenticated: action.payload,
                }
            };
            break
        case 'FILTERED_CURRENCY':
            return {
                ...state,
                currentOption: {
                    ...state.currentOption,
                    currency: action.payload,
                }
            }
        default:
            return state;
    }
};

export default authenticationReducer;
