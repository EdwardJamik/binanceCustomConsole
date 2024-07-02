import React, {useState} from 'react';
import {ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";

const WithoutLoss = () => {
    const dispatch = useDispatch();
    const user = useSelector(state => state.currentOption)
    const positionType = useSelector(state => state.isTypePosition)
    const commission = useSelector(state => state.commission)

    const {price} = usePrice()

    const [isTrailingData, setTrailingData] = useState([
            {
                price: 0,
                deviation: 0,
                isDeviationType: 'percent',
                isPriceType: 'fixed'
            }
        ]
    )

    const handleAmountChange = (value, index, type) => {
        if (value >= 0) {
            let trailingData = [...isTrailingData]

            trailingData[index][type] = value

            setTrailingData(trailingData)

            const userData = [...trailingData]
            dispatch({type: 'SET_WITHOUTLOSS_DATA', payload: userData});
        }
    };

    // function trimToFirstInteger(number) {
    //     let integerPart = Math.trunc(number);
    //
    //     let fractionalPart = number - integerPart;
    //
    //     if (fractionalPart !== 0 && integerPart === 0) {
    //         let factor = 4;
    //         while (fractionalPart * factor < 1) {
    //             factor *= 10;
    //         }
    //         fractionalPart = Math.ceil(fractionalPart * factor) / factor;
    //     }
    //
    //     if (integerPart === 0)
    //         return parseFloat(`${integerPart + fractionalPart}`);
    //     else
    //         return parseFloat(`${integerPart}`);
    // }

    const handleTypeChange = (value, index, type) => {
        let trailingData = [...isTrailingData]

        trailingData[index][type] = value
        setTrailingData(trailingData)


        const userData = [...trailingData]
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const selectAfter = (type, index) => {
        return (
            <Select
                value={isTrailingData[index][type === 'price' ? 'isPriceType' : 'isDeviationType'] === 'fixed' ? 'fixed' : 'percent'}
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
                    {isTrailingData ?
                        isTrailingData?.map((item, index) => {

                            const currentSize =  (parseFloat(user?.amount)/parseFloat(price))
                            const cross = isTrailingData[0]?.isPriceType  === 'fixed' ? parseFloat(isTrailingData[0]?.price) : (parseFloat(isTrailingData[0]?.price)*(parseFloat(price)) / 100)
                            const fee = ((parseFloat(currentSize)*parseFloat(user?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker))*2

                            const priceProcent = user[`withoutLoss`].procent

                            const withousLossLong = (((parseFloat(user?.amount)*parseFloat(user?.adjustLeverage)) + (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))
                            const withousLossShort = (((parseFloat(user?.amount)*parseFloat(user?.adjustLeverage)) - (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))

                            return (
                                <div key={index} style={{position: 'relative'}}>
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