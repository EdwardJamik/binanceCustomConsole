import React from 'react';
import {Button, ConfigProvider} from "antd";
import {useSocket} from "../Socket/Socket.jsx";
import {useSelector} from "react-redux";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";

const CreateShort = () => {
    const socket = useSocket()

    const symbol = useSelector(state => state.symbol)
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission.commissionTaker)

    const price = usePrice()

    const openShort = () => {
        let data = {
            symbol: user.currency,
            side: 'SELL',
            positionSide: 'SHORT',
            quantity: `${user.amount}`,
            currentPrice: parseFloat(price?.price),
            leverage: user?.adjustLeverage
        }

        const take_profit = {
            status: user.takeProfit.status,
            stopPrice: user.takeProfit.price,
            currentPrice: parseFloat(price?.price),
            percent: user.takeProfit.procent
        }

        const trailing = {
            status: user.trailing.status,
            stopPrice: user.trailing.price,
            currentPrice: parseFloat(price?.price),
            percent: user.trailing.procent
        }

        const withoutLoss = {
            status: user.withoutLoss.status,
            stopPrice: user.withoutLoss.price,
            currentPrice: parseFloat(price?.price),
            percent: user.withoutLoss.procent,
            commission: commission
        }

        const macd = {
            status: user.macd.status,
            type:user.macd.type,
            type_g: user.macd.type_g,
            number:user.macd.number,
            timeFrame:user.macd.timeFrame,
        }

        if(user.takeProfit.status)
            data = {...data, take_profit:{...take_profit}};

        if(user.trailing.status)
            data = {...data, trailing:{...trailing}};

        if(user.withoutLoss.status)
            data = {...data, withoutLoss:{...withoutLoss}};

        if(user.macd.status)
            data = {...data, macd:{...macd}};

        console.log(data)
        // dispatch({type: 'FILTERED_CURRENCY', payload: value})
        socket.emit('createOrder', {
            order: {...data}
        });

        // {
        //         symbol:`BTCUSDT`,
        //         side:'BUY', // or SELL
        //         positionSide:`LONG`, //or SHORT
        //         quantity:`0.004`,
        //         take_profit:{
        //              stopPrice:`58000`, -  відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
        //              percent: false - false - це точна сума, true - в вісотках
        //         }, // price is required for STOP (Not STOP_MARKET)
        //         stop_loss:{
        //              stopPrice:`58000`, -  відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
        //            percent: false - false - це точна сума, true - в вісотках
        //         }, // price is required for TAKE_PROFIT (Not TAKE_PROFIT_MARKET)
        //         trailing_stop_market: {
        //              callbackRate:`1` - відсоток або точна сума
        //              currentPrice: 61000, - теперішня ціна за пару
        //              percent: false - false - це точна сума, true - в вісотках
        //         },
        // macd:{
        //     type:'LONG',
        //         number:2,
        //         timeFrame:'5m'
        // },
        // withoutLoss:{
        //     price:0,
        //         percent:false
        // }
        // }
    }

    return (
        <div>
            <div>
                <ConfigProvider
                    theme={{
                        components: {
                            Button: {
                                colorPrimary: `rgb(246, 70, 93)`,
                                fontWeight: '600',
                                colorPrimaryHover: `rgb(246, 70, 93,0.8)`,
                                colorPrimaryActive: `rgb(246, 70, 93,0.8)`,
                                lineWidth: 0,
                            },
                        },
                    }}
                >
                    <Button style={{width:'160px',height:'50px'}} type="primary" size="large" onClick={()=>openShort()} loading={user?.currency !== symbol && price > 0}>
                        Open Short
                    </Button>
                </ConfigProvider>
            </div>
        </div>
    );
};

export default CreateShort;