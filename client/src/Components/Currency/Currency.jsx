import React, {useEffect, useState} from 'react';
import {ConfigProvider, Badge, InputNumber, Select, Spin, Switch} from "antd";
import axios from "axios";
import {url} from "../../Config.jsx";
import {useDispatch, useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";
import AmountPosition from "../AmountPosition.jsx";
import {LoadingOutlined} from "@ant-design/icons";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import MacdSetting from "../MacdSetting/MacdSetting.jsx";

const Currency = () => {

    const socket = useSocket()
    const [isCurrency, setCurrency] = useState();
    const [isPrecent, setPrecent] = useState(0);
    const [currencyListOpen, setCurrencyListOpen] = useState(false);

    const dispatch = useDispatch();
    const symbol = useSelector(state => state.symbol)

    const {price, position} = usePrice()
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission)

    const onChange = (value, before) => {
        if (before) {
            if(parseFloat(value) !== parseFloat(user?.adjustLeverage)) {
                dispatch({type: 'SET_LEVERAGE', payload: parseInt(value)});
                socket.emit('setLeverage', {value, price});

            }
        }
    };

    function trimToFirstInteger(number) {
        let integerPart = Math.trunc(number);

        let fractionalPart = number - integerPart;

        if (fractionalPart !== 0 && integerPart === 0) {
            let factor = 1;
            while (fractionalPart * factor < 1) {
                factor *= 10;
            }
            fractionalPart = Math.ceil(fractionalPart * factor) / factor;
        }

        if(integerPart === 0)
            return `${integerPart + fractionalPart}`;
        else
            return `${integerPart}`;
    }

    function roundToFirstSignificantDecimal(number) {
        let integerPart = Math.trunc(number);

        let fractionalPart = number - integerPart;

        if (fractionalPart !== 0 && integerPart === 0) {
            let factor = 1;
            while (fractionalPart * factor < 1) {
                factor *= 10;
            }
            fractionalPart = Math.ceil(fractionalPart * factor) / factor;
        }

        if(integerPart === 0)
            return `${integerPart + fractionalPart}`;
        else
            return `${integerPart}`;

    }

    useEffect(() => {
        const currentSize =  parseFloat(user?.amount)/parseFloat(price)
        const minPrice = parseFloat(user.minCurrencyPrice) * parseFloat(price)

        if(minPrice > parseFloat(user?.amount))
            dispatch({type: 'SET_SIZE', payload: minPrice});

        const precent = trimToFirstInteger(parseFloat(currentSize)*parseFloat(user?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker)
        setPrecent(precent)

    }, [price,user?.amount,user?.adjustLeverage]);

    const onChangeSize = (value,before) => {
        const currentSize =  (parseFloat(value)/parseFloat(price)).toFixed(2)
        const precent = (trimToFirstInteger(parseFloat(currentSize)*parseFloat(user?.adjustLeverage))*parseFloat(price)*parseFloat(commission.commissionTaker))
        setPrecent(precent)
        // dispatch({type: 'SET_SIZE', payload: parseFloat(value)});
        // socket.emit('setSize', {value, symbol, user});
        if (!before) {
            dispatch({type: 'SET_SIZE', payload: parseFloat(value)});
        } else {
            socket.emit('setSize', {value, symbol, user});
        }
    };

    useEffect(() => {
        axios.post(`${url}/api/v1/info/getCurrency/`, {withCredentials: true}).then((response) => {
            if (response) {
                setCurrency(response?.data?.pairs)
            }
        });
    }, [])

    const handleCurrencyChange = (value) => {
        dispatch({type: 'FILTERED_CURRENCY', payload: value})
        socket.emit('changeCurrency', value);
    };

    const changeOrders = (checked, type) => {
        const userData = {...user}
        if (type === 1) {
            if(!user?.withoutLoss?.status && !user?.macd?.status){
                const value = {...userData, takeProfit: {...userData.takeProfit, status: checked}}
                dispatch({type: 'SET_USER_DATA', payload: value});
                socket.emit('setUserData', {value});
            } else{
                openNotificationWithIcon('warning', 'Warning', 'Take Profi не может работат с БУ и MACD');
            }
        } else if (type === 2) {
            if(!user?.takeProfit?.status) {
                const value = {...userData, withoutLoss: {...userData.withoutLoss, status: checked}}
                dispatch({type: 'SET_USER_DATA', payload: value});
                socket.emit('setUserData', {value});
            } else {
                openNotificationWithIcon('warning', 'Warning', 'БУ не может работат с Take Profi');
            }
        } else if (type === 3) {
            if(!user?.takeProfit?.status) {
                const value = {...userData, trailing: {...userData.trailing, status: checked}}
                dispatch({type: 'SET_USER_DATA', payload: value});
                socket.emit('setUserData', {value});
            } else{
                openNotificationWithIcon('warning', 'Warning', 'Trailing не может работат с Take Profi');
            }
        } else if (type === 4) {
            if(!user?.takeProfit?.status) {
                const value = {...userData, macd: {...userData.macd, status: checked}}
                dispatch({type: 'SET_USER_DATA', payload: value});
                socket.emit('setUserData', {value});
            } else {
                openNotificationWithIcon('warning', 'Warning', 'MACD не может работат с Take Profi');
            }
        }
    };

    const handleMouseEnter = () => {
        setCurrencyListOpen(true);
    };

    const handleMouseLeave = () => {
        setCurrencyListOpen(false);
    };

    return (
        <>
            <div className="" style={{
                position: 'relative',
                maxWidth: '200px',
                height: '100%',
                maxHeight: '48px',
                margin: '0 auto',
                fontSize: "30px",
                fontWeight: 'bold',
                marginBottom:'40px',
                color: position ? "rgb(14, 203, 129)" : "rgb(246, 70, 93)"
            }}>
                {price > 0 ?
                    <>
                        {price}
                    <span style={{
                        position: 'absolute',
                        fontSize: '12px',
                        right: '0',
                        bottom: '-10px',
                        color: '#fff'
                    }}>
                    {symbol}
                    </span>
                    </>
                    :
                    <Spin
                    indicator={
                    <LoadingOutlined
                    style={{
                    fontSize: 24,
                }}
                                spin
                            />
                        }
                    />
                }

            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: '1fr',
                gridColumnGap: '0px',
                gridRowGap: '0px',
                maxWidth: '600px',
                width:'100%',
                margin: '0 auto',
            }}>
                <div className="currency" onMouseEnter={handleMouseEnter}
                     onMouseLeave={handleMouseLeave}>
                    <span className='gold'>Валютная пара:</span>
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
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        <Select
                            className='currency_selector'
                            showSearch
                            dropdownStyle={{
                                background: 'rgba(7, 7, 7, 0.6)',
                                border: 'none',
                                padding: '10px 8px 10px',
                                textAlign: 'center',
                                width: '160px',
                            }}
                            placeholder="Search currency"
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.label.toLowerCase().includes(input.toLowerCase())
                            }
                            open={currencyListOpen}
                            filterSort={(optionA, optionB) =>
                                (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                            }
                            onChange={handleCurrencyChange}
                            options={isCurrency}
                            defaultValue={symbol}
                        />
                    </ConfigProvider>
                </div>
                <div className="leverage">
                    <span className='gold'>Кредитное плечо:</span>
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
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol ?
                            <InputNumber
                                className='inputLeverage'
                                min={1}
                                max={user?.maxAdjustLeverage}
                                // value={user?.adjustLeverage}
                                defaultValue={user?.adjustLeverage}
                                onChange={(value) => onChange(value, false)}
                                onBlur={(e) => onChange(e.target.value, true)}
                                changeOnWheel
                                style={{width: `100%`}}
                            />
                        :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }
                    </ConfigProvider>
                </div>
                <div className="leverage">
                    <span style={{right: '20%',left:'auto',width:'auto',top:'50%',transform:'translate(40%, 40%)', color:'rgba(255,255,255,.6)', fontSize:'14px'}}>{isPrecent && !isNaN(isPrecent) && user?.currency === symbol ? <>&#8776; {isPrecent.toLocaleString()}</> : <></>}</span>
                    <span className='gold'>Сумма инвестиции:</span>
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
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol && price ?
                            <>
                                <InputNumber
                                    className='inputLeverage size'
                                    min={(user.minCurrencyPrice * price).toFixed(2)}
                                    value={parseFloat(user.amount).toFixed(2)}
                                    step={0.1}
                                    onChange={(value) => onChangeSize(value, false)}
                                    onBlur={() => onChangeSize(user?.amount, true)}
                                    changeOnWheel
                                    style={{width: `100%`}}
                                />

                            </>
                            :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }

                    </ConfigProvider>
                </div>
            </div>
            <div style={{
                maxWidth: '500px',
                margin: '0 auto',
                width: '100%',
                padding: '40px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <div>
                    <ConfigProvider
                        theme={{
                            token: {
                                colorTextSecondary: '#000',
                                colorTextLabel: '#000',
                                colorTextBase: '#fff',
                                optionFontSize: '20px',
                                colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                optionSelectedFontWeight: '600',
                                boxShadowSecondary: 'none',

                                colorBgContainer: 'none',
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol ?
                            <Switch
                                checkedChildren="TP"
                                unCheckedChildren="TP"
                                checked={user?.takeProfit?.status}
                                onChange={(checked) => {
                                    changeOrders(checked, 1)
                                }}
                            />
                            :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }
                    </ConfigProvider>

                </div>

                <div>
                    <ConfigProvider
                        theme={{
                            token: {
                                colorTextSecondary: '#000',
                                colorTextLabel: '#000',
                                colorTextBase: '#fff',
                                optionFontSize: '20px',
                                colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                optionSelectedFontWeight: '600',
                                boxShadowSecondary: 'none',

                                colorBgContainer: 'none',
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol ?
                            <Switch checkedChildren="БУ" unCheckedChildren="БУ" checked={user?.withoutLoss?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 2)
                                    }}/>
                            :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }
                    </ConfigProvider>
                </div>

                <div>
                    <ConfigProvider
                        theme={{
                            token: {
                                colorTextSecondary: '#000',
                                colorTextLabel: '#000',
                                colorTextBase: '#fff',
                                optionFontSize: '20px',
                                colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                optionSelectedFontWeight: '600',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol ?
                            <Switch checkedChildren="Trail" unCheckedChildren="Trail" checked={user?.trailing?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 3)
                                    }}/>
                            :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }
                    </ConfigProvider>
                </div>
                <div>
                    <ConfigProvider
                        theme={{
                            token: {
                                colorTextSecondary: '#000',
                                colorTextLabel: '#000',
                                colorTextBase: '#fff',
                                optionFontSize: '20px',
                                colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                optionSelectedFontWeight: '600',
                                boxShadowSecondary: 'none',

                                colorBgContainer: 'none',
                                colorBorder: 'none',

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        {user?.currency === symbol ?
                            <Switch checkedChildren="macd" unCheckedChildren="macd" checked={user?.macd?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 4)
                                    }}/>
                            :
                            <Spin
                                indicator={
                                    <LoadingOutlined
                                        style={{
                                            fontSize: 24,
                                        }}
                                        spin
                                    />
                                }
                            />
                        }
                    </ConfigProvider>
                </div>
            </div>

            <div style={{
                display: "flex",
                maxWidth:'800px',
                margin:'0 auto',
                gap:'30px'
            }}>

                {user?.takeProfit?.status && user?.currency === symbol ?
                    <div className='dashboard_item' style={{padding: '10px',display:'inline-block'}}>
                        <Badge.Ribbon text="Take profit" style={{top: '-20px', right:'-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <AmountPosition type='takeProfit'/>

                    </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }
                {user?.withoutLoss?.status && user?.currency === symbol ?
                    <div className='dashboard_item' style={{padding: '10px'}}>
                        <Badge.Ribbon text="БУ" style={{top: '-20px', right:'-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <AmountPosition type='withoutLoss'/>

                    </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }

                {user?.trailing?.status && user?.currency === symbol ?
                    <div className='dashboard_item' style={{padding: '10px'}}>
                        <Badge.Ribbon text="Trailing" style={{top: '-20px', right:'-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <AmountPosition type='trailing'/>

                    </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }
                {user?.macd?.status && user?.currency === symbol ?
                    <div className='dashboard_item' style={{display:'inline-block', padding: '10px', height:'200px'}}>
                        <Badge.Ribbon text="MACD" style={{top: '-20px', right:'-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <MacdSetting/>

                        </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }

            </div>
        </>
    );
};

export default Currency;