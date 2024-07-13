import React from 'react';
import {Badge, Button, ConfigProvider, Spin, Table, Timeline} from "antd";
import {useSocket} from "../Socket/Socket.jsx";
import {useDispatch, useSelector} from "react-redux";

import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import {LoadingOutlined} from "@ant-design/icons";

dayjs.extend(utc);
dayjs.extend(timezone)

const PositionActive = () => {
    const userTimezone = dayjs.tz.guess();
    const socket = useSocket()
    const positions = useSelector(state => state.positions)
    const positionsPrices = useSelector(state => state.positionPrice)
    const dispatch = useDispatch();
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission)

    const closePosition = ({symbol, positionSide, quantity, type, id}) => {
        const order = {symbol, positionSide, side: positionSide === 'LONG' ? 'SELL' : 'BUY', quantity, type, id}
        socket.emit('createOrder', {order});
    }

    const closeOrder = ({symbol, id_order, id}) => {
        console.log(id_order)
        // const order = {symbol, positionSide, side: positionSide === 'LONG' ? 'SELL' : 'BUY', quantity, type, id}
        socket.emit('closeOrder', {symbol, id_order, id});
    }

    socket.on("positionPrices", (data) => {
        const updatePrices = {...positionsPrices, [data[0]]: data[1]}
        dispatch({type: 'FILTERED_POSITION_PRICE', payload: updatePrices});
    });

    const columns = [
        {
            title: '',
            dataIndex: 'createdAt',
            key: 'name',
            align: 'center',
            width: '70px',
            render: (createdAt) => <>{dayjs(createdAt).tz(userTimezone).format('DD.MM.YYYY')}<br/>{dayjs(createdAt).tz(userTimezone).format('HH:mm:ss')}</>,
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
            render: (_, record) => <>
                {parseFloat(record?.leverage) > 1 ? `${(parseFloat(record?.positionData?.cumQuote) / parseFloat(record?.leverage)).toFixed(2)}/${parseFloat(record?.positionData?.cumQuote)} (${parseFloat(record?.positionData?.origQty)})`
                    :
                    `${(parseFloat(record?.positionData?.cumQuote) / parseFloat(record?.leverage)).toFixed(2)} (${parseFloat(record?.positionData?.origQty)})`
                }
            </>,
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
                        {record.positionData.positionSide === 'LONG' &&
                            (() => {
                                const precent = parseFloat(record?.positionData?.origQty) * parseFloat(positionsPrices[record?.positionData?.symbol]) * parseFloat(record?.openedConfig?.commission)
                                const profit = ((((parseFloat(positionsPrices[record?.positionData?.symbol]) - parseFloat(record?.startPrice)) * parseFloat(record?.positionData?.origQty))) - (precent + parseFloat(record?.commission))).toFixed(2)
                                const procent = ((((parseFloat(positionsPrices[record?.positionData?.symbol]) - parseFloat(record?.startPrice)) / parseFloat(record?.startPrice))) * 100 * parseFloat(record?.leverage) - (precent + parseFloat(record?.commission))).toFixed(2);
                                const fixProfit = record?.ordersId?.withoutLoss ? parseFloat(record?.ordersId?.withoutLoss?.fixedPrice) : record?.ordersId?.TAKE_PROFIT_MARKET ? ((((parseFloat(record?.ordersId?.TAKE_PROFIT_MARKET?.stopPrice) - parseFloat(record?.startPrice)) * ((parseFloat(record?.openedConfig?.quantity)))))).toFixed(2) : 0

                                // (parseFloat(record?.startPrice) * parseFloat(record?.ordersId?.TRAILING_STOP_MARKET?.priceRate) / 100).toFixed(2)

                                return !isNaN(profit) || !isNaN(procent) ?
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        margin: '0 auto'

                                    }}>
                                        {!isNaN(positionsPrices[record?.positionData?.symbol]) && positionsPrices[record?.positionData?.symbol] ?
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gridTemplateRows: 'repeat(2, 1fr)',
                                                gridColumnGap: '12px',
                                                gridRowGap: '20px',
                                                width: 'fit-content'
                                            }}>
                                                <div style={{display: 'flex', gridArea: '1 / 1 / 3 / 2'}}>
                                                    <Badge.Ribbon placement='start' text="Цена" style={{
                                                        top: '-14px',
                                                        fontSize: '12px',
                                                        background: '#1A1A1A'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            minWidth: '120px',
                                                            height: '100%',
                                                            fontSize: '18px',
                                                            gridArea: '1 / 1 / 3 / 2',
                                                            width: '100%',
                                                            border: '1px solid',
                                                            borderRadius: '10px',
                                                        }}
                                                        >
                                                            {parseFloat(positionsPrices[record?.positionData?.symbol])}
                                                        </div>
                                                    </Badge.Ribbon>
                                                </div>
                                                {!record?.ordersId?.macd && record?.ordersId || !record?.ordersId?.withoutLoss && record?.ordersId || record?.ordersId?.withoutLoss && record?.ordersId?.TRAILING_STOP_MARKET && record?.ordersId || record?.ordersId?.TAKE_PROFIT_MARKET && record?.ordersId ?
                                                    <div>
                                                        <Badge.Ribbon placement='start' text="Фикс по алго"
                                                                      style={{
                                                                          top: '-14px',
                                                                          fontSize: '12px',
                                                                          background: '#1A1A1A'
                                                                      }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                fontSize: '14px',
                                                                lineHeight: '16px',
                                                                padding: '8px 2px',
                                                                width: '100%',
                                                                minWidth: '120px',
                                                                maxWidth: '120px',
                                                                border: '1px solid',
                                                                borderRadius: '10px',
                                                                color: fixProfit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                                                                borderColor: '#fff'
                                                            }}
                                                            >
                                                                {record?.ordersId?.withoutLoss.fix ? fixProfit : 0}
                                                            </div>
                                                        </Badge.Ribbon>
                                                    </div>
                                                    :
                                                    <></>
                                                }

                                                <div>
                                                    <Badge.Ribbon placement='start' text="Прибыль"
                                                                  style={{
                                                                      top: '-14px',
                                                                      fontSize: '12px',
                                                                      background: '#1A1A1A'
                                                                  }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            fontSize: '14px',
                                                            lineHeight: '16px',
                                                            padding: '8px 2px',
                                                            width: '100%',
                                                            minWidth: '120px',
                                                            maxWidth: '120px',
                                                            border: '1px solid',
                                                            borderRadius: '10px',
                                                            color: profit >= 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                                                            borderColor: '#fff'
                                                        }}
                                                        >
                                                            {profit}
                                                            <br/>
                                                            {procent}%
                                                        </div>
                                                    </Badge.Ribbon>
                                                </div>

                                            </div>

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
                                    />;
                            })()
                        }
                        {record.positionData.positionSide === 'SHORT' &&
                            (() => {

                                const precent = parseFloat(record?.positionData?.origQty) * parseFloat(positionsPrices[record?.positionData?.symbol]) * parseFloat(record?.openedConfig?.commission)
                                const profit = ((((parseFloat(record?.startPrice) - parseFloat(positionsPrices[record?.positionData?.symbol])) * parseFloat(record?.positionData?.origQty)) - (precent + parseFloat(record?.commission)))).toFixed(2)
                                const procent = ((((parseFloat(record?.startPrice) - parseFloat(positionsPrices[record?.positionData?.symbol])) / parseFloat(record?.startPrice))) * 100 * parseFloat(record?.leverage) - (precent + parseFloat(record?.commission))).toFixed(2);
                                // const fixProfit = record?.ordersId?.TAKE_PROFIT_MARKET ? ((((parseFloat(record?.startPrice) - parseFloat(record?.ordersId?.TAKE_PROFIT_MARKET?.stopPrice)) * (parseFloat(record?.positionData?.origQty)))) - (precent + parseFloat(record?.commission))).toFixed(2) : (parseFloat(record?.startPrice) * parseFloat(record?.ordersId?.TRAILING_STOP_MARKET?.priceRate) / 100).toFixed(2)
                                const fixProfit = record?.ordersId?.withoutLoss ? parseFloat(record?.ordersId?.withoutLoss?.fixedPrice) : record?.ordersId?.TAKE_PROFIT_MARKET ? ((((parseFloat(record?.startPrice) - parseFloat(record?.ordersId?.TAKE_PROFIT_MARKET?.stopPrice)) * ((parseFloat(record?.openedConfig?.quantity)))))).toFixed(2) : 0

                                return !isNaN(profit) || !isNaN(procent) ?
                                    <div style={{
                                        position: 'relative',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        margin: '0 auto'

                                    }}>
                                        {!isNaN(positionsPrices[record?.positionData?.symbol]) && positionsPrices[record?.positionData?.symbol] ?
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gridTemplateRows: 'repeat(2, 1fr)',
                                                gridColumnGap: '12px',
                                                gridRowGap: '20px',
                                                width: 'fit-content'
                                            }}>
                                                <div style={{display: 'flex', gridArea: '1 / 1 / 3 / 2'}}>
                                                    <Badge.Ribbon placement='start' text="Цена" style={{
                                                        top: '-14px',
                                                        fontSize: '12px',
                                                        background: '#1A1A1A'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            minWidth: '120px',
                                                            height: '100%',
                                                            fontSize: '18px',
                                                            gridArea: '1 / 1 / 3 / 2',
                                                            width: '100%',
                                                            border: '1px solid',
                                                            borderRadius: '10px',
                                                        }}
                                                        >
                                                            {(positionsPrices[record?.positionData?.symbol])}
                                                        </div>
                                                    </Badge.Ribbon>
                                                </div>
                                                {!record?.ordersId?.macd && record?.ordersId || !record?.ordersId?.withoutLoss && record?.ordersId || record?.ordersId?.withoutLoss && record?.ordersId?.TRAILING_STOP_MARKET && record?.ordersId || record?.ordersId?.TAKE_PROFIT_MARKET && record?.ordersId ?
                                                    <div>
                                                        <Badge.Ribbon placement='start' text="Фикс по алго"
                                                                      style={{
                                                                          top: '-14px',
                                                                          fontSize: '12px',
                                                                          background: '#1A1A1A'
                                                                      }}>
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'center',
                                                                alignItems: 'center',
                                                                fontSize: '14px',
                                                                lineHeight: '16px',
                                                                padding: '8px 2px',
                                                                width: '100%',
                                                                minWidth: '120px',
                                                                maxWidth: '120px',
                                                                border: '1px solid',
                                                                borderRadius: '10px',
                                                                color: fixProfit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                                                                borderColor: '#fff'
                                                            }}
                                                            >
                                                                {record?.ordersId?.withoutLoss.fix ? fixProfit : 0}
                                                            </div>
                                                        </Badge.Ribbon>
                                                    </div>
                                                    :
                                                    <></>
                                                }


                                                <div>
                                                    <Badge.Ribbon placement='start' text="Прибыль"
                                                                  style={{
                                                                      top: '-14px',
                                                                      fontSize: '12px',
                                                                      background: '#1A1A1A'
                                                                  }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'center',
                                                            alignItems: 'center',
                                                            fontSize: '14px',
                                                            lineHeight: '16px',
                                                            padding: '8px 2px',
                                                            width: '100%',
                                                            minWidth: '120px',
                                                            maxWidth: '120px',
                                                            border: '1px solid',
                                                            borderRadius: '10px',
                                                            color: profit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                                                            borderColor: '#fff'
                                                        }}
                                                        >
                                                            {profit}
                                                            <br/>
                                                            {procent}%
                                                        </div>
                                                    </Badge.Ribbon>
                                                </div>

                                            </div>

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
                                    />;
                            })()
                        }
                        <div style={{display: 'flex', alignItems: 'center', marginLeft: '30px'}}>
                            <Timeline
                                items={[
                                    {
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        color: (record?.ordersId?.TAKE_PROFIT_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'Take Profit',
                                    },
                                    {
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        color: (record?.ordersId?.withoutLoss ? '#f0d85a' : '#1A1A1A'),
                                        children: <>БУ {record?.ordersId?.withoutLoss?.fixed || record?.ordersId?.withoutLoss?.fix ?
                                            <span style={{color: 'rgb(14, 203, 129)'}}>FIXED</span> : ''}</>,
                                    },
                                    {
                                        style: {display: 'flex', paddingBottom: '16px', height: '34px'},
                                        color: (record?.ordersId?.TRAILING_STOP_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'CH',
                                    },
                                    {
                                        style: {display: 'flex', paddingBottom: '0', height: '0'},
                                        color: (record?.ordersId?.macd ? '#f0d85a' : '#1A1A1A'),
                                        children: 'MACD',
                                    },
                                ]}
                            />
                        </div>
                    </div>
                );
            },
        },
        Table.EXPAND_COLUMN,

    ];

    return (
        <>
            <div style={{
                width: '100%',
                background: '#0E0E0E',
            }}>
                {/*<div style={{maxWidth:'800px', width:'100%', margin:'0 auto', color: 'rgba(246, 70, 93, 0.8)', fontSize: '16px',marginBottom:'10px'}}>*/}
                {/*    Прибыль: -0.38*/}
                {/*</div>*/}

                {positions ?

                    <div style={{display: 'flex', justifyContent: 'center', margin: '0 auto', width: '100%'}}>
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
                                pagination={false}
                                expandable={{
                                    expandedRowRender: (record) => (
                                        <div>
                                            <div style={{display: 'flex', justifyContent: 'flex-end', width: '100%'}}>
                                                {record?.ordersId?.TAKE_PROFIT_MARKET && !record?.ordersId?.macd && !record?.ordersId?.withoutLoss ?
                                                    <Button type='primary' style={{
                                                        background: 'none',
                                                        border: '1px solid',
                                                        marginRight: '16px'
                                                    }} onClick={() => closeOrder({
                                                        symbol: record?.currency,
                                                        id_order: record?.ordersId?.TAKE_PROFIT_MARKET?.orderId,
                                                        id: record.key
                                                    })}>
                                                        Отключить Take Profit
                                                    </Button>
                                                    :
                                                    <></>
                                                }
                                                {record?.ordersId?.withoutLoss && !record?.ordersId?.macd ?
                                                    <Button type='primary' style={{
                                                        background: 'none',
                                                        border: '1px solid',
                                                        marginRight: '16px'
                                                    }} onClick={() => closeOrder({
                                                        ...record.openedConfig,
                                                        quantity: record?.positionData?.executedQty,
                                                        id: record.key
                                                    })}>
                                                        Отключить БУ
                                                    </Button>
                                                    :
                                                    <></>
                                                }
                                                {record?.ordersId?.TRAILING_STOP_MARKET ?
                                                    <Button type='primary' style={{
                                                        background: 'none',
                                                        border: '1px solid',
                                                        marginRight: '16px'
                                                    }} onClick={() => closeOrder({
                                                        symbol: record?.currency,
                                                        id_order: record?.ordersId?.TRAILING_STOP_MARKET?.orderId,
                                                        id: record.key
                                                    })}>
                                                        Отключить Trailing
                                                    </Button>
                                                    :
                                                    <></>
                                                }
                                                {record?.ordersId?.macd && !record?.ordersId?.TAKE_PROFIT_MARKET && !record?.ordersId?.withoutLoss ?
                                                    <Button type='primary' style={{
                                                        background: 'none',
                                                        border: '1px solid',
                                                        marginRight: '16px'
                                                    }} onClick={() => closeOrder({
                                                        ...record.openedConfig,
                                                        quantity: record?.positionData?.executedQty,
                                                        id: record.key
                                                    })}>
                                                        Отключить macd
                                                    </Button>
                                                    :
                                                    <></>
                                                }
                                                <Button danger onClick={() => closePosition({
                                                    ...record.openedConfig,
                                                    quantity: record?.positionData?.executedQty,
                                                    id: record?.positionData?.orderId
                                                })}>
                                                    Закрыть позицию
                                                </Button>
                                                {record.description}
                                            </div>
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(3,1fr)',
                                                gridTemplateRows: '1fr',
                                                gridColumnGap: '10px',
                                                gridRowGap: '10px',
                                                marginTop: '10px'
                                            }}>
                                                <span style={{margin: '0 auto'}}>Комиссия открытия: {parseFloat(record?.commission).toFixed(6)}</span>
                                                <span style={{margin: '0 auto'}}>Комиссия закрытия: {((record?.positionData?.origQty * parseFloat(positionsPrices[record?.positionData?.symbol])) * record?.openedConfig?.commission).toFixed(6)}</span>
                                                {record?.ordersId?.withoutLoss ? <span style={{margin: '0 auto'}}><h4 style={{color:'#fff',margin: '0 0 4px'}}>БУ</h4>Фикс цена: {parseFloat(record?.ordersId?.withoutLoss?.fixedPrice).toFixed(6)}<br/>MIN отклонение: {parseFloat(record?.ordersId?.withoutLoss?.minDeviation).toFixed(6)}<br/>MAX отклонение: {parseFloat(record?.ordersId?.withoutLoss?.maxDeviation).toFixed(6)}</span> : <></>}
                                            </div>
                                        </div>
                                    ),
                                }}
                                dataSource={positions}
                            />
                        </ConfigProvider>
                    </div>
                    :
                    <div> Нет открытых позиций</div>
                }

            </div>
        </>
    );
};

export default PositionActive;