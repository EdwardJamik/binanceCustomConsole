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

const PositionBefore = () => {
    const userTimezone = dayjs.tz.guess();
    const socket = useSocket()
    const positions = useSelector(state => state.positionsBefore)
    const dispatch = useDispatch();
    const user = useSelector(state => state.currentOption)
    const commission = useSelector(state => state.commission)

    const closeOrder = ({symbol, positionSide, quantity, type, id}) =>{
        const order = {symbol, positionSide, side: positionSide === 'LONG' ? 'SELL' : 'BUY', quantity, type, id}
        socket.emit('createOrder', {order});
    }

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
            return parseFloat(strNum.slice(0, nextDigitIndex + 1));
        }
    }

    const columns = [
        {
            title: '',
            dataIndex: 'createdAt',
            key: 'name',
            align:'center',
            width:'70px',
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
            align:'center',
            width:'160px',
        },
        {
            title: 'Направление',
            dataIndex: 'positionData',
            key: 'positionSide',
            align:'center',
            width:'160px',
            render: (_,record) =>
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
            align:'center',
            width:'160px',
            render: (leverage) => <div style={{fontSize:'18px'}}>x{leverage}</div>,
        },
        {
            title: 'Сумма',
            dataIndex: 'positionData',
            key: 'origQty',
            align:'center',
            width:'200px',
            render: (_,record) => <>{(parseFloat(record?.positionData?.cumQuote)/parseInt(record?.leverage)).toFixed(2)}/{parseFloat(record?.positionData?.cumQuote).toFixed(2)} ({`${parseFloat(record?.positionData?.origQty)}`})</>,
        },
        {
            title: 'Прибыль',
            dataIndex: 'ClosePositionData',
            key: 'ClosePositionData',
            align: 'center',
            width: '200px',
            render: (_, record) => {


                let result = 0
                if(record?.ClosePositionData?.rp){

                    let percent = 0
                    const commission = parseFloat(record?.commission) + ((parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap)) * parseFloat(record?.openedConfig?.commission))
                    const profit = ((((parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap))) - parseFloat(record?.positionData?.cumQuote)) - commission).toFixed(6)

                    if (record?.ClosePositionData?.ps === 'SHORT')
                        percent = ((((parseFloat(record?.startPrice) - parseFloat(record?.ClosePositionData?.ap)) / parseFloat(record?.startPrice))) * 100 * parseFloat(record?.leverage) - (commission)).toFixed(2);
                    else
                        percent = ((((parseFloat(record?.ClosePositionData?.ap) - parseFloat(record?.startPrice)) / parseFloat(record?.startPrice))) * 100 * parseFloat(record?.leverage) - (commission)).toFixed(2);

                    return <div style={{display: 'flex', flexDirection: 'column'}}>
                        <div><span style={{
                            color: result > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                            fontSize: '16px'
                        }}>{profit} ({percent}%)</span></div>
                        <span style={{fontSize: '12px'}}>Комиссия открытия: {parseFloat(record?.commission).toFixed(6)}</span>
                        <span style={{fontSize: '12px'}}>Комиссия закрытия: {((parseFloat(record?.ClosePositionData?.q) * parseFloat(record?.ClosePositionData?.ap)) * parseFloat(record?.openedConfig?.commission)).toFixed(6)}</span>
                    </div>
                 } else if(record?.ClosePositionData){

                    const currentSize = (parseFloat(record?.ClosePositionData?.cumQuote) - parseFloat(record?.positionData?.cumQuote)) - parseFloat(record?.commission)
                    const precent = parseFloat(record?.ClosePositionData?.cumQuote)*parseFloat(record?.openedConfig?.commission)
                    const result = (currentSize - precent).toFixed(6)

                    return <div style={{display: 'flex', flexDirection: 'column'}}>
                        <div><span style={{
                            color: result > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',
                            fontSize: '16px'
                        }}>{profit} ({percent}%)</span></div>
                        <span style={{fontSize: '12px'}}>Грязная прибыль: {parseFloat(currentSize).toFixed(6)}</span>
                        <span style={{fontSize: '12px'}}>Комиссия открытия: {parseFloat(record?.commission).toFixed(6)}</span>
                        <span style={{fontSize: '12px'}}>Комиссия закрытия: {parseFloat(precent).toFixed(6)}</span>
                    </div>
                } else {
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
                    <div style={{display:'flex', alignItems:'center', justifyContent:'center'}}>
                        {/*{record.positionData.positionSide === 'LONG' &&*/}
                        {/*    (() => {*/}
                        {/*        const precent = (parseFloat(record?.openedConfig?.quantity)*(parseFloat(user?.adjustLeverage)*2))*parseFloat(positionsPrices[record?.positionData?.symbol])*parseFloat(commission.commissionTaker)*/}
                        {/*        const profit = ((((parseFloat(positionsPrices[record?.positionData?.symbol]) - parseFloat(record?.startPrice)) * ((parseFloat(record?.openedConfig?.quantity))*(parseFloat(user?.adjustLeverage)*2))))-(precent*2)).toFixed(2)*/}
                        {/*        const procent = ((((parseFloat(positionsPrices[record?.positionData?.symbol]) - parseFloat(record?.startPrice)) / parseFloat(record?.startPrice)))*100*parseFloat(record?.leverage)-(precent*2)).toFixed(2);*/}

                        {/*        return !isNaN(profit) || !isNaN(procent) ?*/}
                        {/*            <div style={{*/}
                        {/*                position:'relative',*/}
                        {/*                display:'flex',*/}
                        {/*                justifyContent:'center',*/}
                        {/*                alignItems:'center',*/}
                        {/*                margin:'0 auto'*/}

                        {/*            }}>*/}
                        {/*                {!isNaN(positionsPrices[record?.positionData?.symbol]) && positionsPrices[record?.positionData?.symbol] ?*/}
                        {/*                    <div style={{*/}
                        {/*                        display: 'grid',*/}
                        {/*                        gridTemplateColumns: 'repeat(2, 1fr)',*/}
                        {/*                        gridTemplateRows: 'repeat(2, 1fr)',*/}
                        {/*                        gridColumnGap: '12px',*/}
                        {/*                        gridRowGap: '20px',*/}
                        {/*                        width: 'fit-content'*/}
                        {/*                    }}>*/}
                        {/*                        <div style={{ display:'flex',gridArea: '1 / 1 / 3 / 2'}}>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Цена" style={{top:'-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    minWidth:'120px',*/}
                        {/*                                    height:'100%',*/}
                        {/*                                    fontSize: '18px',*/}
                        {/*                                    gridArea: '1 / 1 / 3 / 2',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {(positionsPrices[record?.positionData?.symbol]).toFixed(1)}*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}
                        {/*                        <div>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Фикс по алго"*/}
                        {/*                                          style={{top: '-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    fontSize: '14px',*/}
                        {/*                                    lineHeight: '16px',*/}
                        {/*                                    padding: '8px 2px',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    minWidth: '120px',*/}
                        {/*                                    maxWidth: '120px',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                    color: profit >= 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',*/}
                        {/*                                    borderColor: '#fff'*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {profit} usdt*/}
                        {/*                                    <br/>*/}
                        {/*                                    {procent}%*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}

                        {/*                        <div>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Прибыль"*/}
                        {/*                                          style={{top: '-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    fontSize: '14px',*/}
                        {/*                                    lineHeight: '16px',*/}
                        {/*                                    padding: '8px 2px',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    minWidth: '120px',*/}
                        {/*                                    maxWidth: '120px',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                    color: profit >= 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',*/}
                        {/*                                    borderColor: '#fff'*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {profit} usdt*/}
                        {/*                                    <br/>*/}
                        {/*                                    {procent}%*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}

                        {/*                    </div>*/}

                        {/*                    :*/}
                        {/*                    <Spin*/}
                        {/*                        indicator={*/}
                        {/*                            <LoadingOutlined*/}
                        {/*                                style={{*/}
                        {/*                                    fontSize: 24,*/}
                        {/*                                }}*/}
                        {/*                                spin*/}
                        {/*                            />*/}
                        {/*                        }*/}
                        {/*                    />*/}
                        {/*                }*/}

                        {/*            </div>*/}

                        {/*            :*/}
                        {/*            <Spin*/}
                        {/*                indicator={*/}
                        {/*                    <LoadingOutlined*/}
                        {/*                        style={{*/}
                        {/*                            fontSize: 24,*/}
                        {/*                        }}*/}
                        {/*                        spin*/}
                        {/*                    />*/}
                        {/*                }*/}
                        {/*            />;*/}
                        {/*    })()*/}
                        {/*}*/}
                        {/*{record.positionData.positionSide === 'SHORT' &&*/}
                        {/*    (() => {*/}
                        {/*        const precent = (parseFloat(record?.openedConfig?.quantity)*(parseFloat(user?.adjustLeverage)*2))*parseFloat(positionsPrices[record?.positionData?.symbol])*parseFloat(commission.commissionTaker)*/}
                        {/*        const profit = ((((parseFloat(record?.startPrice)-parseFloat(positionsPrices[record?.positionData?.symbol])) * ((parseFloat(record?.openedConfig?.quantity))*(parseFloat(user?.adjustLeverage)*2))))-(precent*2)).toFixed(2)*/}
                        {/*        const procent = ((((parseFloat(record?.startPrice)-parseFloat(positionsPrices[record?.positionData?.symbol])) / parseFloat(record?.startPrice)))*100*parseFloat(record?.leverage)-(precent*2)).toFixed(2);*/}

                        {/*        return !isNaN(profit) || !isNaN(procent) ?*/}
                        {/*            <div style={{*/}
                        {/*                position:'relative',*/}
                        {/*                display:'flex',*/}
                        {/*                justifyContent:'center',*/}
                        {/*                alignItems:'center',*/}
                        {/*                margin:'0 auto'*/}

                        {/*            }}>*/}
                        {/*                {!isNaN(positionsPrices[record?.positionData?.symbol]) && positionsPrices[record?.positionData?.symbol] ?*/}
                        {/*                    <div style={{*/}
                        {/*                        display: 'grid',*/}
                        {/*                        gridTemplateColumns: 'repeat(2, 1fr)',*/}
                        {/*                        gridTemplateRows: 'repeat(2, 1fr)',*/}
                        {/*                        gridColumnGap: '12px',*/}
                        {/*                        gridRowGap: '20px',*/}
                        {/*                        width: 'fit-content'*/}
                        {/*                    }}>*/}
                        {/*                        <div style={{ display:'flex',gridArea: '1 / 1 / 3 / 2'}}>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Цена" style={{top:'-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    minWidth:'120px',*/}
                        {/*                                    height:'100%',*/}
                        {/*                                    fontSize: '18px',*/}
                        {/*                                    gridArea: '1 / 1 / 3 / 2',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {(positionsPrices[record?.positionData?.symbol]).toFixed(1)}*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}
                        {/*                        <div>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Фикс по алго"*/}
                        {/*                                          style={{top: '-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    fontSize: '14px',*/}
                        {/*                                    lineHeight: '16px',*/}
                        {/*                                    padding: '8px 2px',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    minWidth: '120px',*/}
                        {/*                                    maxWidth: '120px',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                    color: profit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',*/}
                        {/*                                    borderColor: '#fff'*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {profit} usdt*/}
                        {/*                                    <br/>*/}
                        {/*                                    {procent}%*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}

                        {/*                        <div>*/}
                        {/*                            <Badge.Ribbon placement='start' text="Прибыль"*/}
                        {/*                                          style={{top: '-14px', fontSize:'12px', background: '#1A1A1A'}}>*/}
                        {/*                                <div style={{*/}
                        {/*                                    display: 'flex',*/}
                        {/*                                    justifyContent: 'center',*/}
                        {/*                                    alignItems: 'center',*/}
                        {/*                                    fontSize: '14px',*/}
                        {/*                                    lineHeight: '16px',*/}
                        {/*                                    padding: '8px 2px',*/}
                        {/*                                    width: '100%',*/}
                        {/*                                    minWidth: '120px',*/}
                        {/*                                    maxWidth: '120px',*/}
                        {/*                                    border: '1px solid',*/}
                        {/*                                    borderRadius: '10px',*/}
                        {/*                                    color: profit > 0 ? 'rgb(14, 203, 129,0.8)' : 'rgba(246, 70, 93, 0.8)',*/}
                        {/*                                    borderColor: '#fff'*/}
                        {/*                                }}*/}
                        {/*                                >*/}
                        {/*                                    {profit} usdt*/}
                        {/*                                    <br/>*/}
                        {/*                                    {procent}%*/}
                        {/*                                </div>*/}
                        {/*                            </Badge.Ribbon>*/}
                        {/*                        </div>*/}

                        {/*                    </div>*/}

                        {/*                    :*/}
                        {/*                    <Spin*/}
                        {/*                        indicator={*/}
                        {/*                            <LoadingOutlined*/}
                        {/*                                style={{*/}
                        {/*                                    fontSize: 24,*/}
                        {/*                                }}*/}
                        {/*                                spin*/}
                        {/*                            />*/}
                        {/*                        }*/}
                        {/*                    />*/}
                        {/*                }*/}

                        {/*            </div>*/}

                        {/*            :*/}
                        {/*            <Spin*/}
                        {/*                indicator={*/}
                        {/*                    <LoadingOutlined*/}
                        {/*                        style={{*/}
                        {/*                            fontSize: 24,*/}
                        {/*                        }}*/}
                        {/*                        spin*/}
                        {/*                    />*/}
                        {/*                }*/}
                        {/*            />;*/}
                        {/*    })()*/}
                        {/*}*/}
                        <div style={{display:'flex', alignItems:'center', marginLeft:'30px'}}>
                            <Timeline
                                items={[
                                    {
                                        style:{display:'flex', paddingBottom:'16px', height:'34px'},
                                        color: (record?.ordersId?.TAKE_PROFIT_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'Take Profit',
                                    },
                                    {
                                        color: '#1A1A1A',
                                        style:{display:'flex', paddingBottom:'16px', height:'34px'},
                                        children: 'БУ',
                                    },
                                    {
                                        style:{display:'flex', paddingBottom:'16px', height:'34px'},
                                        color: (record?.ordersId?.TRAILING_STOP_MARKET ? '#f0d85a' : '#1A1A1A'),
                                        children: 'Trailing',
                                    },
                                    {
                                        style:{display:'flex', paddingBottom:'0', height:'0'},
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
            background:'#0E0E0E',
        }}>
            {positions ?

                <div style={{display: 'flex', justifyContent: 'center', margin:'0 auto', width:'100%'}}>
                    <ConfigProvider
                        theme={{
                            components: {
                                Table:{
                                    borderColor:'rgb(14, 14, 14)',
                                    colorBorderBg:'rgb(14, 14, 14)',
                                    headerColor:'rgba(240, 216, 90, 0.6)',
                                    headerSplitColor:'rgba(240, 216, 90, 0)',
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
                            dataSource={positions}
                        />
                    </ConfigProvider>
                </div>

                :
                <div> Нет выполненных позиций</div>
            }

        </div>
    );
};

export default PositionBefore;