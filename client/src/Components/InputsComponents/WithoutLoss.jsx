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
                isDeviationType: 'fixed',
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
            return parseFloat(strNum.slice(0, nextDigitIndex + 4));
        }
    }

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
                <Option default value="fixed">$</Option>
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
                            const cross = isTrailingData[0]?.isPriceType  === 'fixed' ? parseFloat(isTrailingData[0]?.price) : ((parseFloat(price) * parseFloat(isTrailingData[0]?.price)) / 100)
                            const fee = (trimToFirstInteger(parseFloat(currentSize)*parseFloat(user?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker))*2

                            const priceProcent = user[`withoutLoss`].procent

                            const withousLossShort = (((parseFloat(user?.amount)*parseFloat(user?.adjustLeverage)) - (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))
                            const withousLossLong = (((parseFloat(user?.amount)*parseFloat(user?.adjustLeverage)) + (parseFloat(cross)+parseFloat(fee))) * parseFloat(price)) / (parseFloat(user?.amount)*parseFloat(user?.adjustLeverage))

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
                                               trimToFirstInteger(withousLossLong)
                                               :
                                               trimToFirstInteger(withousLossShort)
                                           }
                                       </span>
                                        <span style={{
                                            textAlign: 'center',
                                            fontWeight: '400',
                                            fontSize: '12px',
                                            color: '#fff'
                                        }}>
                                            {positionType ?
                                                item?.isDeviationType === 'fixed' ? <>min: {trimToFirstInteger(parseFloat(withousLossLong) - parseFloat(item?.deviation))}<br/>max: {trimToFirstInteger(parseFloat(withousLossLong) + parseFloat(item?.deviation))}</> : <>min: {trimToFirstInteger(parseFloat(withousLossLong) - parseFloat(item?.deviation))}<br/>max: {trimToFirstInteger(parseFloat(withousLossLong) + (parseFloat(price) * parseFloat(item?.deviation) / 100))}</>
                                                :
                                                item?.isDeviationType === 'fixed' ? <>min: {trimToFirstInteger(parseFloat(withousLossShort) + parseFloat(item?.deviation))}<br/>max: {trimToFirstInteger(parseFloat(withousLossShort) - parseFloat(item?.deviation))}</> : <>min: {trimToFirstInteger(parseFloat(withousLossShort) + parseFloat(item?.deviation))}<br/>max: {trimToFirstInteger(parseFloat(withousLossShort) - (parseFloat(price) * parseFloat(item?.deviation) / 100))}</>
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