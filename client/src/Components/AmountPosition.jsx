import React from 'react';
import {ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {useSocket} from "./Socket/Socket.jsx";
import {usePrice} from "./PriceSocket/PriceSocket.jsx";


const AmountPosition = ({type}) => {

    const dispatch = useDispatch();
    const amount = useSelector(state => state.amount)
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission)
    const socket = useSocket()

    const {price, position} = usePrice()

    const handleAmountChange = (value) => {
        const userData = {...user}

            const arr = {...userData, [`${type}`]: {...userData[`${type}`],price:value}}
            dispatch({type: 'SET_USER_DATA', payload: arr});
            socket.emit('setUserData', {value:arr});
    };

    const handleTypeChange = (value) => {
        const userData = {...user}

        const arr = {...userData, [`${type}`]: {...userData[`${type}`],procent:value === 'procent'}}
        dispatch({type: 'SET_USER_DATA', payload: arr});
        socket.emit('setUserData', {value:arr});

    };

    function trimToFirstInteger(num) {
        let strNum = num.toString();
        let dotIndex = strNum.indexOf('.');
        if (dotIndex === -1 || dotIndex === strNum.length - 1) {
            return num;
        } else {
            let nextDigitIndex = dotIndex + 1;
            while (nextDigitIndex < strNum.length && strNum[nextDigitIndex] === '0') {
                nextDigitIndex++;
            }
            return parseFloat(strNum.slice(0, nextDigitIndex + 1));
        }
    }

    const selectAfter = (
        <Select
            value={user[`${type}`].procent ? 'procent' : 'fixed'}
            style={{
                width: 60,
            }}
            onChange={(value)=>handleTypeChange(value)}
        >
            <Option default value="fixed">$</Option>
            <Option value="procent">%</Option>
        </Select>
    );
    return (
        <div style={{maxWidth:'200px'}}>
            <ConfigProvider
                theme={{
                    token: {
                        colorTextBase:'#fff',
                        colorBorder:'rgba(240, 216, 90, 0.4)',
                        controlOutline:'none',
                        colorBgElevated:'#131313',
                        colorBgContainer: '#0E0E0E',
                        colorPrimary:'rgba(240, 216, 90, 0.2)',
                        colorPrimaryBg:'rgba(240, 216, 90, 0.4)',
                        colorPrimaryHover:'rgba(240, 216, 90, 0.4)',
                        colorFillTertiary:'rgba(240, 216, 90, 0.6)',
                    },

                }}
            >
            <InputNumber
                style={{
                    padding:'6px 6px 6px',
                    textAlign:'center',
                }}
                addonAfter={selectAfter}
                value={user[`${type}`].price}
                onChange={(value)=>{handleAmountChange(value)}}
                min={type === 'withoutLoss' ? 0.0000000001 : 0.1}
                step={0.1}
                defaultValue={amount}
            />
                {type === 'takeProfit' && user[`${type}`].procent ?
                    <>
                        <span style={{
                            fontSize: '14px',
                            color: 'rgb(14, 203, 129,0.8)',
                            fontWeight: '200',
                            padding: '0 10px'
                        }}>Long - <span style={{fontWeight:'600',fontSize:'16px'}}>{((parseFloat(price) * user[`${type}`].price / 100) + parseFloat(price)).toFixed(2)}</span></span>
                        <br/>
                        <span style={{
                            fontSize: '14px',
                            color: 'rgb(246, 70, 93,0.8)',
                            fontWeight: '200',
                            padding: '0 10px'
                        }}>Short - <span style={{fontWeight:'600',fontSize:'16px'}}>{(parseFloat(price) - (parseFloat(price) * user[`${type}`].price / 100)).toFixed(2)}</span></span>
                    </>
                    :
                    <></>
                }
                {type === 'withoutLoss' ?
                    (()=>{
                        const currentSize =  (parseFloat(user?.amount)/parseFloat(price))
                        const cross = user[`${type}`].procent ? ((parseFloat(price) * parseFloat(user[`${type}`].price)) / 100) : parseFloat(user[`${type}`].price)
                        const fee = (trimToFirstInteger(parseFloat(currentSize)*parseFloat(user?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker))*2

                        const priceProcent = user[`${type}`].procent

                        const withousLossShort = ((
                            (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))
                            -
                            (parseFloat(cross)+parseFloat(fee))
                        )
                            *
                            parseFloat(price)
                        )
                            /
                            (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))

                        const withousLossLong = ((
                                    (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))
                                    +
                                    (parseFloat(cross)+parseFloat(fee))
                                )
                                *
                                parseFloat(price)
                            )
                            /
                            (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))


                        return <><span style={{
                            color: 'rgb(14, 203, 129,0.8)',
                            padding: '0 10px',
                            fontWeight:'600',fontSize:'16px'
                        }}>Long: {withousLossLong.toFixed(3)} {priceProcent} </span><br/>
                            <span style={{
                                color: 'rgb(246, 70, 93,0.8)',
                                padding: '0 10px',
                                fontWeight:'600',fontSize:'16px'
                            }}>Short: {withousLossShort.toFixed(3)}</span>
                        </>

                    })()
                    :
                    <></>


                }
            </ConfigProvider>
        </div>
    );
};

export default AmountPosition;