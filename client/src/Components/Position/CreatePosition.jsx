import React, {useState} from 'react';
import {useSocket} from "../Socket/Socket.jsx";
import {useDispatch, useSelector} from "react-redux";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";
import {Button, Checkbox, ConfigProvider, Spin, Switch} from "antd";
import {LoadingOutlined} from "@ant-design/icons";

const CreatePosition = () => {
    const socket = useSocket()

    const [positionSide, setPositionSide] = useState(true)

    const dispatch = useDispatch();
    const symbol = useSelector(state => state.symbol)
    const positionType = useSelector(state => state.isTypePosition)
    const user = useSelector(state => state.currentOption)
    const userOptions = useSelector(state => state)
    const commission = useSelector(state => state.commission.commissionTaker)

    const price = usePrice()

    const openPosition = () => {
        let data = {
            symbol: user.currency,
            side: positionSide ? 'BUY' : 'SELL',
            positionSide: positionSide ? 'LONG' : 'SHORT',
            quantity: `${parseFloat(user.amount)}`,
            currentPrice: parseFloat(price?.price),
            leverage: user?.adjustLeverage,
            commission: commission,
        }

        const take_profit = {
            status: user.takeProfit.status,
            stopPrice: user.takeProfit.price,
            currentPrice: parseFloat(price?.price),
            percent: user.takeProfit.procent
        }

        const trailing = {
            status: user.trailing.status,
            option: userOptions?.trailing ? userOptions?.trailing : null
        }

        console.log(userOptions)
        const withoutLoss = {
            status: user.withoutLoss.status,
            option: userOptions?.withoutLoss ? {...userOptions?.withoutLoss[0],commission} : null
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

        socket.emit('createOrder', {
            order: {...data}
        });
    }

    const setTypePosition = (type) =>{
        setPositionSide(type)
        dispatch({type: 'SET_POSITION_TYPE', payload: type});
    }

    return (
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center'}}>
            <div style={{marginBottom:'30px'}}>
                <ConfigProvider
                    theme={{
                        token: {
                            colorTextSecondary: '#000',
                            colorTextLabel: '#000',
                            colorTextBase: '#fff',
                            optionFontSize: '20px',

                            colorFillContentHover: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorFillSecondary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,

                            colorFill: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,

                            colorPrimary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,

                            colorPrimaryHover: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorInfoHover: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            optionSelectedFontWeight: '600',

                            colorPrimaryBg: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorFillTertiary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorTextTertiary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorTextQuaternary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            colorFillQuaternary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                        },
                    }}
                >
                        <Switch checkedChildren="LONG" unCheckedChildren="SHORT" checked={positionType} onChange={(checked) => setTypePosition(checked)}/>
                </ConfigProvider>
            </div>

            <ConfigProvider
                theme={{
                    components: {
                        Button: {
                            colorPrimary: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            fontWeight: '600',
                            colorPrimaryHover: positionSide ? `rgb(14, 203, 129)` : `rgb(246, 70, 93)`,
                            lineWidth: 0,
                        },
                    },
                }}
            >
                <Button style={{width: '160px', height: '50px'}} type="primary" size="large" onClick={() => openPosition()}
                        loading={user?.currency !== symbol && price > 0}>
                    Open {positionSide ? 'LONG':'SHORT'}
                </Button>
            </ConfigProvider>
        </div>
    );
};

export default CreatePosition;