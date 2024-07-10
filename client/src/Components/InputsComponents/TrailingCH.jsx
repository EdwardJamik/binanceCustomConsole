import React from 'react';
import {Button, ConfigProvider, InputNumber, Select} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";


const TrailingCh = () => {

    const dispatch = useDispatch();
    const userOption = useSelector(state => state.currentOption)
    const socket = useSocket()

    const handleAmountChange = (value, index, type) => {
        if (value >= 0) {
            let trailingData = [...userOption?.trailing?.option]

            if(type === 'deviation' && userOption?.trailing?.option[index]?.isDeviationType === 'fixed')
                trailingData[index][type] = parseFloat(value) <= parseFloat(userOption?.trailing?.option[index]?.price) ? value : parseFloat(userOption?.trailing?.option[index]?.price)
            else
                trailingData[index][type] = value

            const userData = [...trailingData]

            socket.emit('setUserData', {value:  {...userOption, trailing: {status:userOption?.trailing?.status, option:[...trailingData]}}});
            dispatch({type: 'SET_TRAILING_DATA', payload: userData});
        }
    };

    const handleTypeChange = (value, index, type) => {
        let trailingData = [...userOption?.trailing?.option]

        trailingData[index][type] = value

        const userData = [...trailingData]
        socket.emit('setUserData', {value:  {...userOption, trailing: {status:userOption?.trailing?.status,option:[...trailingData]}}});
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const addTrailingData = () => {
        let trailingData = [...userOption?.trailing?.option,{
            price: 0,
            deviation: 0,
            isDeviationType: 'percent',
            isPriceType: 'fixed'
        }]

        // setTrailingData(trailingData)
        const userData = [...trailingData]
        socket.emit('setUserData', {value: {...userOption, trailing: {status:userOption?.trailing?.status,option:[...trailingData]}}});
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const removeTrailingData = (index) => {
        let trailingData = [...userOption?.trailing?.option]

        trailingData?.splice(index,1)

        // setTrailingData(trailingData)
        const userData = [...trailingData]
        socket.emit('setUserData', {value: {...userOption, trailing: {status:userOption?.trailing?.status,option:[...trailingData]}}});
        dispatch({type: 'SET_TRAILING_DATA', payload: userData});
    };

    const selectAfter = (type, index) => {
        return (
            <Select
                value={userOption?.trailing?.option[index][type === 'price' ? 'isPriceType' : 'isDeviationType'] === 'fixed' ? 'fixed' : 'percent'}
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
                    {userOption?.trailing?.option ?
                        userOption?.trailing?.option?.map((item, index) =>
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
                                    {userOption?.trailing?.option?.length - 1 === index ?
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