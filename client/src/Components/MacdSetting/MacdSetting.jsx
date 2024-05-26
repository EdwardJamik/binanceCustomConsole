import React from 'react';
import {ConfigProvider, InputNumber, Radio, Select} from 'antd';
import {useDispatch, useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";


const MacdSetting = () => {

    const socket = useSocket()
    const dispatch = useDispatch();
    const user = useSelector(state => state.currentOption)

    const onChange = (type, value) => {
        let data
        if (type === 1) {
            dispatch({type: 'FILTERED_MACD', payload: {type: value}});
            data = {...user, macd: {...user.macd, type: value}}
        } else if (type === 2) {
            dispatch({type: 'FILTERED_MACD', payload: {type_g: value}});
            data = {...user, macd: {...user.macd, type_g: value}}
        } else if (type === 3) {
            dispatch({type: 'FILTERED_MACD', payload: {timeFrame: value}});
            data = {...user, macd: {...user.macd, timeFrame: value}}
        } else if (type === 4) {
            dispatch({type: 'FILTERED_MACD', payload: {number: value}});
            data = {...user, macd: {...user.macd, number: value}}
        }

        socket.emit('setUserData', {value:data});
    };

    const filterOption = (input, option) =>
        (option?.label ?? '').toLowerCase().includes(input.toLowerCase());

    return (
        <div>
            <ConfigProvider
                theme={{
                    components: {
                        Radio: {
                            colorBorder: 'none',
                        }
                    }
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                    maxWidth:'200px',
                    marginTop: '6px',
                    fontSize: '8px'
                }}>
                    <Radio.Group value={user?.macd?.type} buttonStyle="solid" onChange={({target: {value}}) => onChange(1, value)}
                                 style={{display: 'flex', width: '100%'}}>
                        <Radio.Button style={{
                            background: 'rgb(246, 70, 93, 0.6)',
                            fontSize: '12px',
                            width: '100%',
                            border: user?.macd?.type === 'short' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                            color: user?.macd?.type === 'short' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                        }} value="short">Short</Radio.Button>
                        <Radio.Button style={{
                            background: 'rgb(14, 203, 129, 0.6)',
                            fontSize: '12px',
                            width: '100%',
                            border: user?.macd?.type === 'long' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                            color: user?.macd?.type === 'long' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                        }} value="long">Long</Radio.Button>
                    </Radio.Group>

                </div>

                <div style={{width: '100%', maxWidth:'200px', padding: '8px'}}>
                    <span className='gold' style={{fontSize: '12px'}}>Цвет свечи</span>
                    {user?.macd?.type === 'short' ?
                        <Radio.Group value={user?.macd?.type_g} buttonStyle="solid"
                                     onChange={({target: {value}}) => onChange(2, value)}
                                     style={{display: 'flex', width: '100%'}}>
                            <Radio.Button style={{
                                background: 'rgba(255, 82, 82, .6)',
                                fontSize: '12px',
                                width: '100%',
                                border: user?.macd?.type_g === 'short' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                                color: user?.macd?.type_g === 'short' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                            }} value="short">Красная</Radio.Button>
                            <Radio.Button style={{
                                background: 'rgba(255, 205, 211, .6)',
                                fontSize: '12px',
                                width: '100%',
                                border: user?.macd?.type_g === 'long' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                                color: user?.macd?.type_g === 'long' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                            }} value="long">
                                Розовая
                            </Radio.Button>
                        </Radio.Group>
                        :
                        <Radio.Group value={user?.macd?.type_g} buttonStyle="solid"
                                     onChange={({target: {value}}) => onChange(2, value)}
                                     style={{display: 'flex', width: '100%'}}>
                            <Radio.Button style={{
                                background: 'rgba(39, 166, 154, .6)',
                                fontSize: '12px',
                                width: '100%',
                                border: user?.macd?.type_g === 'long' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                                color: user?.macd?.type_g === 'long' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                            }} value="long">Зелёная</Radio.Button>
                            <Radio.Button style={{
                                background: 'rgba(178, 224, 220, .6)',
                                fontSize: '12px',
                                width: '100%',
                                border: user?.macd?.type_g === 'short' ? '2px solid rgba(240, 216, 90, .8)' : 'none',
                                color: user?.macd?.type_g === 'short' ? 'rgba(240, 216, 90, .8)' : 'rgba(255,255,255,.6)'
                            }} value="short">
                                Салатовая
                            </Radio.Button>
                        </Radio.Group>
                    }
                </div>
            </ConfigProvider>
            <div style={{display:'flex', margin:'0 auto', maxWidth:'160px', gap:'6px'}}>
                <ConfigProvider
                    theme={{
                        token: {
                            colorTextSecondary: '#000',
                            colorTextLabel: '#000',
                            colorTextBase: '#fff',
                            optionFontSize: '20px',
                            colorPrimaryHover: 'none',
                            optionSelectedFontWeight: '600',
                            boxShadowSecondary: 'none',

                            colorBgContainer: 'none',
                            colorBorder: 'rgba(240, 216, 90, 0.4)',

                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                            fontWeight: '600',
                            colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                            colorTextTertiary: '#000',
                            colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                        },
                    }}
                >

                    <Select
                        showSearch
                        placeholder="Выберите timeframe"
                        optionFilterProp="children"
                        onChange={(value)=>{onChange(3,value)}}
                        filterOption={filterOption}
                        style={{width:'80px'}}
                        value={user?.macd?.timeFrame}
                        dropdownStyle={{
                            background: 'rgba(7, 7, 7, 0.6)',
                            border: 'none',
                            padding: '10px 8px 10px',
                            textAlign: 'center',
                            width: '80px',
                        }}
                        options={[
                            {
                                value: '1m',
                                label: '1m',
                            },
                            {
                                value: '3m',
                                label: '3m',
                            },
                            {
                                value: '15m',
                                label: '15m',
                            },
                            {
                                value: '1H',
                                label: '1H',
                            },
                            {
                                value: '4H',
                                label: '4H',
                            },
                        ]}
                    />
                </ConfigProvider>
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
                    <InputNumber
                        style={{
                            width:'80px',
                            textAlign: 'center',
                        }}
                        value={user?.macd?.number}
                        onChange={(value)=>{onChange(4,value)}}
                        min={2}
                        step={1}
                    />
                </ConfigProvider>
            </div>
        </div>
    );
};

export default MacdSetting;