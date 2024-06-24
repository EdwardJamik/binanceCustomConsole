import React, {useEffect, useState} from 'react';
import {ConfigProvider, Spin, Table, Timeline} from "antd";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {LoadingOutlined} from "@ant-design/icons";
import axios from "axios";
import {url} from "../../Config.jsx";

dayjs.extend(utc);
dayjs.extend(timezone)

const PositionBefore = () => {
    const userTimezone = dayjs.tz.guess();
    const [isPosition, setPosition] = useState(false)

    const getOrder = async () => {
        try {
            const {data} = await axios.post(`${url}/api/v1/getUserBeforePosition/`, {},{withCredentials: true})
            if (data) {
                setPosition(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    useEffect(() => {
        getOrder()
    }, [isPosition]);

    function priceDecimal(num,counter) {
        let strNum = num.toString();
        let dotIndex = strNum.indexOf('.');
        if (dotIndex === -1 || dotIndex === strNum.length - 1) {
            return num;
        } else {
            return String(strNum.slice(0, dotIndex + counter));
        }
    }

    const columns = [
        {
            title: '',
            dataIndex: 'createdAt',
            key: 'name',
            align: 'center',
            width: '70px',
            render: (_, record) =>
                <div style={{fontSize: '12px'}}>
                    {dayjs(record?.createdAt).tz(userTimezone).format('DD.MM.YYYY')}<br/>{dayjs(record?.createdAt).tz(userTimezone).format('HH:mm:ss')}
                    <br/>
                    <br/>
                    {dayjs(record?.updatedAt).tz(userTimezone).format('DD.MM.YYYY')}<br/>{dayjs(record?.updatedAt).tz(userTimezone).format('HH:mm:ss')}
                </div>,
        },
        {
            title: 'Актив',
            dataIndex: 'currency',
            key: 'age',
            align: 'center',
            width: '160px',
        },
        {
            title: 'Направление',
            dataIndex: 'positionData',
            key: 'positionSide',
            align: 'center',
            width: '160px',
            render: (_, record) =>
                <>
                    {record.positionData.positionSide === 'LONG' ?
                        <span style={{color: "rgb(14, 203, 129,0.8)"}}>ВВЕРХ</span>
                        :
                        <span style={{color: "rgba(246, 70, 93, 0.8)"}}>ВНИЗ</span>
                    }
                </>
            ,
        },
        {
            title: 'Плечо',
            dataIndex: 'leverage',
            key: 'leverage',
            align: 'center',
            width: '160px',
            render: (leverage) => <div style={{fontSize: '18px'}}>x{leverage}</div>,
        },
        {
            title: 'Сумма',
            dataIndex: 'positionData',
            key: 'origQty',
            align: 'center',
            width: '200px',
            render: (_, record) => {

                const cumQuantity = parseFloat(record?.positionData?.cumQuote) || 0
                const cumQuantityClose = record?.ClosePositionData?.cumQuote ? parseFloat(record?.ClosePositionData?.cumQuote) : parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap);
                const startPrice = parseFloat(record?.startPrice);
                const closePrice = record?.ClosePositionData?.ap ? parseFloat(record?.ClosePositionData?.ap) : parseFloat(record?.ClosePositionData?.avgPrice);

                return <>
                    <span style={{fontSize: '12px'}}>Цена покупки: {priceDecimal(startPrice, 6)}</span>
                    <br/>
                    {priceDecimal((cumQuantity / parseInt(record?.leverage)), 3)} / {priceDecimal(cumQuantity, 3)}
                    <br/>
                    <span style={{fontSize: '12px'}}>Цена продажи: {priceDecimal(closePrice, 6)}</span>
                    <br/>
                    {priceDecimal((cumQuantityClose / parseInt(record?.leverage)), 3)} / {priceDecimal(cumQuantityClose, 3)}
                </>
            }
        },
        {
            title: 'Прибыль',
            dataIndex: 'ClosePositionData',
            key: 'ClosePositionData',
            align: 'center',
            width: '200px',
            render: (_, record) => {

                const startPrice = parseFloat(record?.startPrice);
                const closePrice = record?.ClosePositionData?.ap ? parseFloat(record?.ClosePositionData?.ap) : parseFloat(record?.ClosePositionData?.avgPrice);
                const quantity = record?.ClosePositionData?.q ? parseFloat(record?.ClosePositionData?.q) : parseFloat(record?.positionData?.origQty);
                const cumQuantity = parseFloat(record?.positionData?.cumQuote) || 0
                const cumQuantityClose = record?.ClosePositionData?.cumQuote ? parseFloat(record?.ClosePositionData?.cumQuote) : parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap);

                const openCommission = parseFloat(record?.commission) || 0
                const closeCommission = record?.ClosePositionData?.cumQuote ? (parseFloat(record?.ClosePositionData?.cumQuote) * parseFloat(record?.openedConfig?.commission)) : ((parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap)) * parseFloat(record?.openedConfig?.commission)) || 0

                let percent = 0, profit = 0

                if(record?.openedConfig?.positionSide === 'SHORT'){
                    percent = priceDecimal((((startPrice - closePrice) / startPrice) * 100 * parseFloat(record?.leverage) - (openCommission+closeCommission)),3);
                    profit = cumQuantity - cumQuantityClose
                } else {
                    percent = priceDecimal((((closePrice - startPrice) / startPrice) * 100 * parseFloat(record?.leverage) - (openCommission+closeCommission)),3);
                    profit = cumQuantityClose - cumQuantity
                }

                if (startPrice) {

                    return <div style={{display: 'flex', flexDirection: 'column'}}>
                        <div>
                            <span style={{
                                color: (profit - (openCommission + closeCommission)) > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                                fontSize: '16px'
                            }}>
                                {priceDecimal(profit - (openCommission + closeCommission), 3)} ({percent}%)
                            </span>
                        </div>
                        <span style={{
                            color: profit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                            fontSize: '12px'
                        }}>Без учета комиссии: {priceDecimal(profit, 3)}</span>
                        <span style={{fontSize: '12px'}}>Комиссия открытия: {priceDecimal(openCommission, 6)}</span>
                        <span style={{fontSize: '12px'}}>Комиссия закрытия: {priceDecimal(closeCommission, 6)}</span>
                    </div>
                }
                    // else if (record?.ClosePositionData) {
                    //
                    //     let currentSize = 0
                    //     if (record?.openedConfig?.positionSide === 'SHORT')
                //         currentSize = (parseFloat(record?.positionData?.cumQuote) - parseFloat(record?.ClosePositionData?.cumQuote)) - parseFloat(record?.commission)
                //     else
                //         currentSize = (parseFloat(record?.ClosePositionData?.cumQuote) - parseFloat(record?.positionData?.cumQuote)) - parseFloat(record?.commission)
                //
                //     const precent = parseFloat(record?.ClosePositionData?.cumQuote) * parseFloat(record?.openedConfig?.commission)
                //     const result = (currentSize - precent).toFixed(6)
                //
                //     return <div style={{display: 'flex', flexDirection: 'column'}}>
                //         <div><span style={{
                //             color: result > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                //             fontSize: '16px'
                //         }}>{parseFloat(currentSize).toFixed(2)} ({parseFloat(precent).toFixed(2)}%)</span></div>
                //         {/*<span style={{fontSize: '12px'}}>Грязная прибыль: {parseFloat(currentSize).toFixed(6)}</span>*/}
                //         <span
                //             style={{fontSize: '12px'}}>Комиссия открытия: {openCommission}</span>
                //         <span style={{fontSize: '12px'}}>Комиссия закрытия: {closeCommission}</span>
                //     </div>
                // }
                else {
                    return <div style={{display: 'flex', flexDirection: 'column'}}>
                        Информация не получения
                    </div>
                }
            }
        },
        {
            title: '',
            dataIndex: 'currency',
            key: 'currency_2',
            align: 'center',
            width: '400px',
            render: (_, record) => {
                return (
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <div style={{display: 'flex', alignItems: 'center', marginLeft: '30px'}}>
                            <Timeline
                                items={[
                                    {
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        color: (record?.ordersId?.TAKE_PROFIT_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'Take Profit',
                                    },
                                    {
                                        color: '#1A1A1A',
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        children: 'БУ',
                                    },
                                    {
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        color: (record?.ordersId?.TRAILING_STOP_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'CH',
                                    },
                                    {
                                        style: {display: 'flex', paddingBottom: '0', height: '0'},
                                        color: '#1A1A1A',
                                        children: 'Macd',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                );
            },
        }
    ];

    return (
        <div style={{
            display: 'flex',
            color: '#fff',
            fontWeight: '600',
            fontSize: '20px',
            width: '100%',
            background: '#0E0E0E',
        }}>

            <div style={{display: 'flex', justifyContent: 'center', margin: '0 auto', width: '100%'}}>
                {Array.isArray(isPosition) ? (
                        <ConfigProvider
                        theme={{
                            components: {
                                Table: {
                                    borderColor: 'rgb(14, 14, 14)',
                                    colorBorderBg: 'rgb(14, 14, 14)',
                                    headerColor: 'rgba(240, 216, 90, 0.6)',
                                    headerSplitColor: 'rgba(240, 216, 90, 0)',
                                }

                            },
                            token: {
                                colorTextBase: '#fff',
                                colorBgContainer: '#0E0E0E',
                                colorPrimary: 'rgba(240, 216, 90, 0.2)',
                            },
                        }}
                    >
                        <Table
                            columns={columns}
                            pagination={true}
                            dataSource={isPosition}
                        />
                    </ConfigProvider>)
                    :
                    (<Spin indicator={<LoadingOutlined spin/>} size="large"/>)
                }
            </div>
        </div>
    );
};

export default PositionBefore;