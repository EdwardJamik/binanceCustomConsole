import React, {useState} from 'react';
import {ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";
import {useSocket} from "../Socket/Socket.jsx";

const WithoutLoss = () => {
    const dispatch = useDispatch();
    const userOption = useSelector(state => state.currentOption)
    const positionType = useSelector(state => state.isTypePosition)
    const commission = useSelector(state => state.commission)

    const socket = useSocket()

    const {price} = usePrice()

    const handleAmountChange = (value, index, type) => {
        if (value >= 0) {
            let trailingData = [...userOption?.withoutLoss?.option]

            trailingData[index][type] = value

            const userData = [...trailingData]
            socket.emit('setUserData', {value:  {...userOption, withoutLoss: {status:userOption?.withoutLoss?.status,option:[...trailingData]}}});
            dispatch({type: 'SET_WITHOUTLOSS_DATA', payload: userData});
        }
    };

    const handleTypeChange = (value, index, type) => {
        let trailingData = [...userOption?.withoutLoss?.option]

        trailingData[index][type] = value

        const userData = [...trailingData]
        socket.emit('setUserData', {value:  {...userOption, withoutLoss: {status:userOption?.withoutLoss?.status,option:[...trailingData]}}});
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const selectAfter = (type, index) => {
        return (
            <Select
                value={userOption?.withoutLoss?.option[index][type === 'price' ? 'isPriceType' : 'isDeviationType'] === 'fixed' ? 'fixed' : 'percent'}
                style={{
                    width: 50,
                }}
                onChange={(value) => handleTypeChange(value, index, type === 'price' ? 'isPriceType' : 'isDeviationType')}
            >
                {type === 'price' ?  <Option default value="fixed">$</Option> : <></> }
                <Option value="percent">%</Option>
            </Select>
        )
    }

    return (
        <div>
            <ConfigProvider
                theme={{
                    token: {
                        colorTextBase: '#fff',
                        colorBorder: 'rgba(240, 216, 90, 0.4)',
                        controlOutline: 'none',
                        colorBgElevated: '#131313',
                        colorBgContainer: '#0E0E0E',
                        colorPrimary: 'rgba(240, 216, 90, 0.2)',
                        colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                        colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                        colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                    },
                }}
            >
                <div style={{maxWidth: '260px'}}>
                    {userOption?.withoutLoss?.option ?
                        userOption?.withoutLoss?.option?.map((item, index) => {

                            // const currentSize =  (parseFloat(userOption?.amount)/parseFloat(price))
                            // const currentSize = (() => {
                            //     const result = parseFloat(userOption?.amount) / parseFloat(price);
                            //     if (Number.isNaN(result) || !Number.isFinite(result)) return 0;
                            //
                            //     const integerPart = Math.trunc(result);
                            //     if (integerPart !== 0) {
                            //         return integerPart;
                            //     } else {
                            //         const fractionalPart = result.toString().split('.')[1];
                            //         let firstTwoIntegers = '';
                            //         let digitCount = 0;
                            //
                            //         for (let digit of fractionalPart) {
                            //             firstTwoIntegers += digit;
                            //             if (digit !== '0') digitCount++;
                            //             if (digitCount === 2) break;
                            //         }
                            //
                            //         return parseFloat(`0.${firstTwoIntegers}`);
                            //     }
                            // })();
                            function roundDecimal(number) {
                                let integerPart = Math.trunc(number);

                                let fractionalPart = number - integerPart;

                                if (fractionalPart !== 0 && integerPart === 0) {
                                    let factor = 1;
                                    while (fractionalPart * factor < 1) {
                                        factor *= 10;
                                    }
                                    fractionalPart = Math.ceil(fractionalPart * factor) / factor;
                                }

                                if (integerPart === 0)
                                    return parseFloat(`${integerPart + fractionalPart}`);
                                else
                                    return parseFloat(`${integerPart}`);

                            }

                            const currentSize = roundDecimal((parseFloat(userOption?.amount))/parseFloat(price))
                            const cross = userOption?.withoutLoss?.option[0]?.isPriceType  === 'fixed' ? parseFloat(userOption?.withoutLoss?.option[0]?.price) : (parseFloat(userOption?.withoutLoss?.option[0]?.price)*(parseFloat(price)) / 100)
                            const fee = ((parseFloat(currentSize)*parseFloat(userOption?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker))*2

                            const priceProcent = userOption?.withoutLoss?.option[0].deviation

                            const withousLossLong = (((parseFloat(userOption?.amount)*parseFloat(userOption?.adjustLeverage)) + (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(userOption?.amount)*parseFloat(userOption?.adjustLeverage))
                            const withousLossShort = (((parseFloat(userOption?.amount)*parseFloat(userOption?.adjustLeverage)) - (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(userOption?.amount)*parseFloat(userOption?.adjustLeverage))

                            return (
                                <div key={index} style={{position: 'relative'}}>
                                    {/*{currentSize}*/}
                                    <div style={{display: 'flex', position: 'relative'}}>

                                        <InputNumber
                                            style={{
                                                padding: '6px 6px 6px',
                                                textAlign: 'center',
                                            }}
                                            addonAfter={selectAfter('price', index)}
                                            value={item?.price}
                                            onChange={(value) => {
                                                handleAmountChange(value, index, 'price')
                                            }}
                                            step={0.1}
                                            size={'small'}
                                            defaultValue={0}
                                            controls={false}
                                        />
                                        <InputNumber
                                            style={{
                                                padding: '6px 6px 6px',
                                                textAlign: 'center',
                                            }}
                                            addonAfter={selectAfter('deviation', index)}
                                            value={item?.deviation}

                                            onChange={(value) => {
                                                handleAmountChange(value, index, 'deviation')
                                            }}
                                            step={0.1}
                                            size={'small'}
                                            defaultValue={0}
                                            controls={false}
                                        />
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateRows: '1fr',
                                        gridTemplateColumns: 'repeat(2,1fr)'
                                    }}>
                                        <span style={{
                                            textAlign: 'center',
                                            fontWeight: '400',
                                            fontSize: '12px',
                                            color: '#fff'
                                        }}>
                                           {positionType ?
                                               parseFloat(withousLossLong).toFixed(6)
                                               :
                                               parseFloat(withousLossShort).toFixed(6)
                                           }
                                       </span>
                                        <span style={{
                                            textAlign: 'center',
                                            fontWeight: '400',
                                            fontSize: '12px',
                                            color: '#fff'
                                        }}>
                                            {positionType ?
                                                item?.isDeviationType === 'fixed' ? <>min: {(parseFloat(withousLossLong) - parseFloat(item?.deviation)).toFixed(6)}<br/>max: {(parseFloat(withousLossLong) + parseFloat(item?.deviation)).toFixed(6)}</> : <>min: {(parseFloat(withousLossLong) - (parseFloat(price) * parseFloat(item?.deviation) / 100)).toFixed(6)}<br/>max: {(parseFloat(withousLossLong) + (parseFloat(price) * parseFloat(item?.deviation) / 100)).toFixed(6)}</>
                                                :
                                                item?.isDeviationType === 'fixed' ? <>min: {(parseFloat(withousLossShort) + parseFloat(item?.deviation)).toFixed(6)}<br/>max: {(parseFloat(withousLossShort) - parseFloat(item?.deviation)).toFixed(6)}</> : <>min: {(parseFloat(withousLossShort) + (parseFloat(price) * parseFloat(item?.deviation) / 100)).toFixed(6)}<br/>max: {(parseFloat(withousLossShort) - (parseFloat(price) * parseFloat(item?.deviation) / 100)).toFixed(6)}</>
                                            }
                                       </span>
                                    </div>
                                </div>
                            )
                            }
                        )
                        :
                        <></>
                    }
                </div>
            </ConfigProvider>
        </div>
    );
};

export default WithoutLoss;