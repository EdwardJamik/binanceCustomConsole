import React from 'react';
import {Button, ConfigProvider} from "antd";
import {useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";

const CreateLong = () => {
    const socket = useSocket()

    const symbol = useSelector(state => state.symbol)
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission.commissionTaker)

    const price = usePrice()

    const openLong = () => {
        let data = {
            symbol: user.currency,
            side: 'BUY',
            positionSide: 'LONG',
            quantity: `${parseFloat(user.amount)}`,
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
    }

    return (
        <div>
            <ConfigProvider
                theme={{
                    components: {
                        Button: {
                            colorPrimary: `rgb(14, 203, 129)`,
                            fontWeight:'600',
                            colorPrimaryHover: `rgb(14, 203, 129,0.8)`,
                            colorPrimaryActive: `rgb(14, 203, 129,0.8)`,
                            lineWidth: 0,
                        },
                    },
                }}
            >
                <Button style={{width:'160px',height:'50px'}} type="primary" size="large" onClick={()=>openLong()} loading={user?.currency !== symbol && price > 0}>
                    Open Long
                </Button>
            </ConfigProvider>
        </div>
    );
};

export default CreateLong;