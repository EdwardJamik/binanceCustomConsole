import React, {useEffect, useState} from 'react';
import {ConfigProvider, Badge, InputNumber, Select, Spin, Switch, TreeSelect, Cascader, Button} from "antd";
import axios from "axios";
import {url} from "../../Config.jsx";
import {useDispatch, useSelector} from "react-redux";
import {useSocket} from "../Socket/Socket.jsx";
import {usePrice} from "../PriceSocket/PriceSocket.jsx";
import AmountPosition from "../AmountPosition.jsx";
import {LoadingOutlined} from "@ant-design/icons";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import MacdSetting from "../MacdSetting/MacdSetting.jsx";
import TrailingCh from "../InputsComponents/TrailingCH.jsx";
import WithoutLoss from "../InputsComponents/WithoutLoss.jsx";
import FavoriteModal from "../FavoriteModal/FavoriteModal.jsx";

const Currency = () => {

    const socket = useSocket()
    const [isCurrency, setCurrency] = useState();
    const [isPrecent, setPrecent] = useState(0);
    const [currencyListOpen, setCurrencyListOpen] = useState(false);
    const [isSaved, setSaved] = useState(false);

    const dispatch = useDispatch();
    const symbol = useSelector(state => state.symbol)

    const {price, position} = usePrice()
    const favoriteOption = useSelector(state => state.favorite)
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

    function roundDecimbal(num) {
        let strNum = num.toString();

        if (strNum.includes('e')) {
            num = parseFloat(num).toFixed(9);
            strNum = num.toString();
        }

        let dotIndex = strNum.indexOf('.');

        if (dotIndex === -1 || dotIndex === strNum.length - 1) {
            return parseFloat(num);
        } else {
            return strNum.slice(0, dotIndex + 3);
        }
    }
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

        if (integerPart === 0)
            return parseFloat(`${integerPart + fractionalPart}`);
        else
            return parseFloat(`${integerPart}`);
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
        if(!Array.isArray(value))
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

    const options = [
        {
            label: 'Light',
            value: 'light',
            children: new Array(20).fill(null).map((_, index) => ({
                label: `Number ${index}`,
                value: index,
            })),
        },
        {
            label: 'Bamboo',
            value: 'bamboo',
            children: [
                {
                    label: 'Little',
                    value: 'little',
                    children: [
                        {
                            label: 'Toy Fish',
                            value: 'fish',
                        },
                        {
                            label: 'Toy Cards',
                            value: 'cards',
                        },
                        {
                            label: 'Toy Bird',
                            value: 'bird',
                        },
                    ],
                },
            ],
        },
    ];

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
                marginBottom: '40px',
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
                    {Array.isArray(symbol) ?  'Избранные' : symbol}
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
                gridTemplateColumns: `repeat(${!isSaved ? '3' :'2'}, 1fr)`,
                gridTemplateRows: '1fr',
                gridColumnGap: '0px',
                gridRowGap: '0px',
                maxWidth: '600px',
                width: '100%',
                margin: '0 auto',
            }}>
                <ConfigProvider
                    theme={{
                        token: {
                            colorFillContentHover: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorFillSecondary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,

                            colorFill: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,

                            colorPrimary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,

                            colorPrimaryHover: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorInfoHover: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            optionSelectedFontWeight: '600',

                            colorPrimaryBg: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorFillTertiary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorTextTertiary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorTextQuaternary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                            colorFillQuaternary: isSaved ? `rgba(14, 203, 129, 0.3)` : `rgba(246, 70, 93, 0.3)`,
                        },
                    }}
                >
                    <div style={{margin:'0 auto'}}>
                        <Switch style={{maxWidth: '100px'}} value={isSaved} size={'small'} checkedChildren="избранные" unCheckedChildren="избранные"
                                onChange={(checked) => setSaved(checked)}
                        />
                    </div>

                </ConfigProvider>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${!isSaved ? '3' :'2'}, 1fr)`,

                gridTemplateRows: '1fr',
                gridColumnGap: '0px',
                gridRowGap: '0px',
                maxWidth: '600px',
                width: '100%',
                margin: '0 auto',
            }}>
                <div className="currency" style={{flexDirection: 'column'}} onMouseEnter={handleMouseEnter}
                     onMouseLeave={handleMouseLeave}>
                    <span className='gold' style={{margin:'0'}}>Валютная пара:</span>
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
                        {isSaved ?

                            <div style={{display:'flex', alignItems:'center'}}>
                                <Select
                                    className='currency_selector'
                                    showSearch
                                    mode="tags"
                                    style={{
                                        width:'300px'
                                    }}
                                    // value={currencyList}
                                    dropdownStyle={{
                                        background: 'rgba(7, 7, 7, 0.6)',
                                        border: 'none',
                                        padding: '10px 8px 10px',
                                        textAlign: 'center',
                                        width:'300px'
                                    }}
                                    placeholder="Выберите избранные"
                                    filterOption={(input, option) =>
                                        option?.label.toLowerCase().includes(input.toLowerCase())
                                    }
                                    filterSort={(optionA, optionB) =>
                                        (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                    }
                                    onChange={handleCurrencyChange}
                                    options={favoriteOption}
                                />
                                <FavoriteModal/>
                            </div>
                            :
                            <Select
                                className='currency_selector'
                                showSearch
                                dropdownStyle={{
                                    background: 'rgba(7, 7, 7, 0.6)',
                                    border: 'none',
                                    padding: '10px 8px 10px',
                                    textAlign: 'center',
                                    // width: '160px',
                                }}
                                placeholder="Валютные пары"
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
                        }

                    </ConfigProvider>

                </div>
                {!isSaved ?
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
                        </ConfigProvider>
                    </div>
                    :
                    <></>
                }
                <div className="leverage">
                    <span style={{
                        right: '20%',
                        left: 'auto',
                        width: 'auto',
                        top: '50%',
                        transform: 'translate(40%, 40%)',
                        color: 'rgba(255,255,255,.6)',
                        fontSize: '14px'
                    }}>{isPrecent && !isNaN(isPrecent) ? <>&#8776; {isPrecent.toLocaleString()}</> : <></>}</span>
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
                        {price ?
                            <>
                                <InputNumber
                                    className='inputLeverage size'
                                    min={(user.minCurrencyPrice * price).toFixed(2)}
                                    value={roundDecimbal(user.amount)}
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
                            <Switch
                                checkedChildren="TP"
                                unCheckedChildren="TP"
                                checked={user?.takeProfit?.status}
                                onChange={(checked) => {
                                    changeOrders(checked, 1)
                                }}
                            />
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

                            <Switch checkedChildren="БУ" unCheckedChildren="БУ" checked={user?.withoutLoss?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 2)
                                    }}/>
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

                            <Switch checkedChildren="CH" unCheckedChildren="CH" checked={user?.trailing?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 3)
                                    }}/>
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
                            <Switch checkedChildren="macd" unCheckedChildren="macd" checked={user?.macd?.status}
                                    onChange={(checked) => {
                                        changeOrders(checked, 4)
                                    }}/>
                    </ConfigProvider>
                </div>
            </div>

            <div style={{
                display: "flex",
                maxWidth: '800px',
                margin: '0 auto',
                gap: '30px'
            }}>

                {user?.takeProfit?.status ?
                    <div className='dashboard_item' style={{padding: '10px', display: 'inline-block'}}>
                        <Badge.Ribbon text="Take profit"
                                      style={{top: '-20px', right: '-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <AmountPosition type='takeProfit'/>

                        </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }
                {user?.withoutLoss?.status ?
                    <div className='dashboard_item' style={{padding: '10px'}}>
                        <Badge.Ribbon text="БУ"
                                      style={{top: '-20px', right: '-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <WithoutLoss/>

                        </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }

                {user?.trailing?.status ?
                    <div className='dashboard_item' style={{padding: '10px'}}>
                        <Badge.Ribbon text="CH" style={{top: '-20px', right: '-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

                            <TrailingCh/>

                        </Badge.Ribbon>
                    </div>
                    :
                    <></>
                }

                {user?.macd?.status  ?
                    <div className='dashboard_item' style={{display: 'inline-block', padding: '10px', height: '200px'}}>
                        <Badge.Ribbon text="MACD"
                                      style={{top: '-20px', right: '-18px', background: 'rgba(240, 216, 90, 0.4)'}}>

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