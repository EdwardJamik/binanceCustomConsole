import React, {useEffect, useState} from 'react';
import {Alert, ConfigProvider, InputNumber, Select} from "antd";
import axios from "axios";
import {url} from "../../Config.jsx";
import {useDispatch, useSelector} from "react-redux";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";

const Currency = () => {

    const [isCurrency, setCurrency] = useState();
    const [currencyListOpen, setCurrencyListOpen] = useState(false);
    const dispatch = useDispatch();
    const symbol = useSelector(state => state.currentOption.currency)

    const [priceUpdates, setPriceUpdates] = useState({price:0, position:true});
    const leverage = useSelector(state => state.currentOption.adjustLeverage)

    const onChange = (value) => {
        // console.log('changed', value);
    };

    const calculateWidth = () => {
        const maxSize = 200;
        const minSize = 26;
        const newValueLength = leverage.length;
        const newSize = minSize + ((maxSize - minSize) * newValueLength) / maxSize;

        return newSize;
    };

    useEffect(() => {
        axios.post(`${url}/api/v1/info/getLeverage/`, {symbol},{withCredentials: true}).then(({data}) => {
            if (data) {
                // console.log(data)
                openNotificationWithIcon('error', 'Error', 'Ошибка: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');
            } else {
                openNotificationWithIcon('error', 'Error', 'Passwords do not match');
            }
        });

        axios.post(`${url}/api/v1/info/getCurrency/`, {withCredentials: true}).then((response) => {
            if (response) {
                openNotificationWithIcon('error', 'Не удалось получить кредитное плече', 'Ошибка: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');
                setCurrency(response?.data?.pairs)
            } else {

            }
        });
    }, [])

    useEffect(() => {
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@markPrice@1s`);

        ws.onopen = () => {
            console.log('Connected to server');
        };

        ws.onmessage = event => {
            const {p} = JSON.parse(event.data)
            setPriceUpdates(prevState => ({
                price: parseFloat(0.000000).toFixed(2),
                position: parseFloat(p) >= parseFloat(prevState.price)
            }))
            // openNotificationWithIcon('error', 'Error', 'Ошибка: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');
            openNotificationWithIcon('error', 'Ошибка проверки API KEYs', 'Error: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');
            ws.close()
            dispatch({ type: 'FILTER_CURRENCY_PRICE', payload: parseFloat(0) });
        };

        return () => {
            ws.close();
        };
    }, [symbol]);

    const handleCurrencyChange = (value) => {
        dispatch({type: 'FILTERED_CURRENCY', payload: value})
        // positionRisk
        axios.post(`${url}/fapi/v2/positionRisk`, {withCredentials: true}).then((response) => {
            if (response) {
                setCurrency(response?.data?.pairs)
            } else {

            }
        });
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
                position:'relative',
                maxWidth: '200px',
                height: '100%',
                maxHeight:'48px',
                margin:'0 auto',
                fontSize: "30px",
                fontWeight: 'bold',
                color: priceUpdates?.position ? "rgb(14, 203, 129)" : "rgb(246, 70, 93)"
            }}>
                {priceUpdates?.price} <span style={{position:'absolute', fontSize:'12px', right:'0',bottom:'-10px', color: '#fff' }}>BTCUSDT</span>
            </div>
            <div style={{display: 'flex', justifyContent:'center', height:'20vh', padding:' 60px 20px'}}>
                <Alert message="Error: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans." type="error" showIcon />
                {/*<div className="currency" onMouseEnter={handleMouseEnter}*/}
                {/*     onMouseLeave={handleMouseLeave}>*/}
                {/*    <span className='gold'>Currency:</span>*/}
                {/*    /!*<ConfigProvider*!/*/}
                {/*    /!*    theme={{*!/*/}
                {/*    /!*        token: {*!/*/}
                {/*    /!*            colorTextSecondary: '#000',*!/*/}
                {/*    /!*            colorTextLabel: '#000',*!/*/}
                {/*    /!*            colorTextBase: '#fff',*!/*/}
                {/*    /!*            optionFontSize: '20px',*!/*/}
                {/*    /!*            colorPrimaryHover: 'none',*!/*/}
                {/*    /!*            optionSelectedFontWeight: '600',*!/*/}
                {/*    /!*            boxShadowSecondary: 'none',*!/*/}

                {/*    /!*            colorBgContainer: 'none',*!/*/}
                {/*    /!*            colorBorder: 'none',*!/*/}

                {/*    /!*            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',*!/*/}
                {/*    /!*            fontWeight: '600',*!/*/}
                {/*    /!*            colorFillTertiary: 'rgba(240, 216, 90, 0.4)',*!/*/}
                {/*    /!*            colorTextTertiary: '#000',*!/*/}
                {/*    /!*            colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',*!/*/}
                {/*    /!*        },*!/*/}
                {/*    /!*    }}*!/*/}
                {/*    /!*>*!/*/}
                {/*    /!*    <Select*!/*/}
                {/*    /!*        className='currency_selector'*!/*/}
                {/*    /!*        showSearch*!/*/}
                {/*    /!*        dropdownStyle={{*!/*/}
                {/*    /!*            background: 'rgba(7, 7, 7, 0.6)',*!/*/}
                {/*    /!*            border: 'none',*!/*/}
                {/*    /!*            padding: '10px 8px 10px',*!/*/}
                {/*    /!*            textAlign: 'center',*!/*/}
                {/*    /!*            width: '160px',*!/*/}
                {/*    /!*        }}*!/*/}
                {/*    /!*        placeholder="Search currency"*!/*/}
                {/*    /!*        optionFilterProp="children"*!/*/}
                {/*    /!*        filterOption={(input, option) =>*!/*/}
                {/*    /!*            option?.label.toLowerCase().includes(input.toLowerCase())*!/*/}
                {/*    /!*        }*!/*/}
                {/*    /!*        open={currencyListOpen}*!/*/}
                {/*    /!*        filterSort={(optionA, optionB) =>*!/*/}
                {/*    /!*            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())*!/*/}
                {/*    /!*        }*!/*/}
                {/*    /!*        onChange={handleCurrencyChange}*!/*/}
                {/*    /!*        options={isCurrency}*!/*/}
                {/*    /!*        defaultValue={symbol}*!/*/}
                {/*    /!*    />*!/*/}
                {/*    /!*</ConfigProvider>*!/*/}
                {/*</div>*/}
                {/*<div className="dashboard_item leverage">*/}
                {/*    <span className='gold'>Adjust Leverage:</span>*/}

                {/*    <InputNumber*/}
                {/*        // prefix="x"*/}
                {/*        className='inputLeverage'*/}
                {/*        min={1}*/}
                {/*        max={120}*/}
                {/*        defaultValue={leverage}*/}
                {/*        onChange={onChange}*/}
                {/*        changeOnWheel*/}
                {/*        style={{width: `${calculateWidth()}px`}}*/}
                {/*        // style={{color:'#fff'}}*/}
                {/*    />*/}
                {/*</div>*/}
            </div>

        </>


    );
};

export default Currency;