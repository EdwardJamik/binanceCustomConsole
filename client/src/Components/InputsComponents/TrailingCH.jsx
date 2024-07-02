import React, {useState} from 'react';
import {Button, ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";


const TrailingCh = () => {

    const dispatch = useDispatch();

    const {price, position} = usePrice()

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

            if(type === 'deviation' && isTrailingData[index]?.isDeviationType === 'fixed')
                trailingData[index][type] = parseFloat(value) <= parseFloat(isTrailingData[index]?.price) ? value : parseFloat(isTrailingData[index]?.price)
            else
                trailingData[index][type] = value

            setTrailingData(trailingData)

            const userData = [...trailingData]
            dispatch({type: 'SET_TRAILING_DATA', payload: userData});
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
            return parseFloat(strNum.slice(0, nextDigitIndex + 2));
        }
    }

    const handleTypeChange = (value, index, type) => {
        let trailingData = [...isTrailingData]

        trailingData[index][type] = value
        setTrailingData(trailingData)


        const userData = [...trailingData]
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const addTrailingData = () => {
        let trailingData = [...isTrailingData,{
            price: 0,
            deviation: 0,
            isDeviationType: 'fixed',
            isPriceType: 'fixed'
        }]

        setTrailingData(trailingData)
        const userData = [...trailingData]
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const removeTrailingData = (index) => {
        let trailingData = [...isTrailingData]

        trailingData?.splice(index,1)

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
                        isTrailingData?.map((item, index) =>
                                <div key={index} style={{position:'relative'}}>
                                    {index !== 0 ?
                                        <Button
                                            key={`button_remove_${index}`}
                                            ghost
                                            danger
                                            style={{
                                                position:'absolute',
                                                left:'-10%',
                                                top:'18%',
                                                zIndex:'9',
                                                maxWidth: '100%',
                                                width: '24px',
                                                padding: '0',
                                                marginRight: '6px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onClick={()=>removeTrailingData(index)}
                                        >
                                            -
                                        </Button>
                                        :
                                        <></>
                                    }

                                    <div style={{display: 'flex', position:'relative'}}>

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
                                       {/*<span style={{textAlign:'center',fontWeight: '400', fontSize: '12px', color: '#fff'}}>*/}
                                       {/*    {positionType ?*/}
                                       {/*        item?.isPriceType === 'fixed' ? trimToFirstInteger(parseFloat(price) + parseFloat(item?.price)) : trimToFirstInteger((parseFloat(price) * parseFloat(item?.price) / 100) + parseFloat(price))*/}
                                       {/*        :*/}
                                       {/*        item?.isPriceType === 'fixed' ? trimToFirstInteger(parseFloat(price) - parseFloat(item?.price)) : trimToFirstInteger(parseFloat(price) - (parseFloat(price) * parseFloat(item?.price) / 100))*/}
                                       {/*    }*/}
                                       {/*</span>*/}
                                       {/* <span style={{textAlign:'center',fontWeight: '400', fontSize: '12px', color: '#fff'}}>*/}
                                       {/*     {positionType ?*/}
                                       {/*         item?.isDeviationType === 'fixed' ? trimToFirstInteger(parseFloat(price) - - parseFloat(item?.deviation)) : trimToFirstInteger(  parseFloat(price) - (parseFloat(item?.price) * parseFloat(item?.deviation) / 100))*/}
                                       {/*         :*/}
                                       {/*         item?.isDeviationType === 'fixed' ? trimToFirstInteger(parseFloat(price) + - parseFloat(item?.deviation)) : trimToFirstInteger(parseFloat(price) + (parseFloat(item?.price) * parseFloat(item?.deviation) / 100))*/}
                                       {/*     }*/}
                                       {/*</span>*/}
                                    </div>
                                    {isTrailingData?.length - 1 === index ?
                                    <Button type={'primary'}
                                            key={`button_add_${index}`}
                                            ghost
                                            onClick={()=>addTrailingData()}
                                            style={{
                                                position:'absolute',
                                                right:'-12%',
                                                top:'18%',
                                                zIndex:'9',
                                                maxWidth: '100%',
                                                width: '24px',
                                                padding: '0',
                                                marginRight: '6px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                    >
                                        +
                                    </Button>
                                        :
                                        <></>
                                    }
                                </div>

                        )
                        :
                        <></>
                    }
                </div>
            </ConfigProvider>
        </div>
    );
};

export default TrailingCh;