import React, { useCallback, useEffect, useMemo, memo } from 'react';
import { Badge, Button, ConfigProvider, Spin, Table, Timeline } from "antd";
import { useSocket } from "../Socket/Socket.jsx";
import { useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { LoadingOutlined } from "@ant-design/icons";
import {url} from "../../Config.jsx";

dayjs.extend(utc);
dayjs.extend(timezone);

const PriceDisplay = memo(({ price, startPrice }) => (
    <Badge.Ribbon placement='start' text="Цена" style={{ top: '-14px', fontSize: '12px', background: '#1A1A1A' }}>
        <div style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minWidth: '120px',
            height: '100%',
            fontSize: '18px',
            width: '100%',
            border: '1px solid',
            borderRadius: '10px',
        }}>
            <span style={{ position: 'absolute', top: '10px', fontSize: '11px', fontWeight: '600' }}>{startPrice}</span>
            {price}
        </div>
    </Badge.Ribbon>
));

const ProfitDisplay = memo(({ profit, procent, fixProfit }) => (
    <>
        {fixProfit !== undefined && (
            <div>
                <Badge.Ribbon placement='start' text="Фикс по алго" style={{ top: '-14px', fontSize: '12px', background: '#1A1A1A' }}>
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
                    }}>
                        {fixProfit}
                    </div>
                </Badge.Ribbon>
            </div>
        )}
        <div>
            <Badge.Ribbon placement='start' text="Прибыль" style={{ top: '-14px', fontSize: '12px', background: '#1A1A1A' }}>
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
                }}>
                    {profit}<br />{procent}%
                </div>
            </Badge.Ribbon>
        </div>
    </>
));

const OrderTimeline = memo(({ ordersId }) => (
    <Timeline
        items={[
            { style: { display: 'flex', paddingBottom: '16px', height: '34px' }, color: (ordersId?.TAKE_PROFIT_MARKET ? '#f0d85a' : '#1A1A1A'), children: 'Take Profit' },
            { style: { display: 'flex', paddingBottom: '16px', height: '34px' }, color: (ordersId?.withoutLoss ? '#f0d85a' : '#1A1A1A'), children: <>БУ {ordersId?.withoutLoss?.fixed || ordersId?.withoutLoss?.fix ? <span style={{ color: 'rgb(14, 203, 129)' }}>FIXED</span> : ''}</> },
            { style: { display: 'flex', paddingBottom: '16px', height: '34px' }, color: (ordersId?.TRAILING_STOP_MARKET ? '#f0d85a' : '#1A1A1A'), children: <>CH {ordersId?.TRAILING_STOP_MARKET?.fix ? <><span style={{ color: 'rgb(14, 203, 129)' }}>{parseInt(ordersId?.TRAILING_STOP_MARKET?.dIndex) + 1}</span></> : ''}</> },
            { style: { display: 'flex', paddingBottom: '0', height: '0' }, color: (ordersId?.macd ? '#f0d85a' : '#1A1A1A'), children: 'MACD' },
        ]}
    />
));

const PositionActive = () => {
    const userTimezone = dayjs.tz.guess();
    const socket = useSocket();
    const positions = useSelector(state => state.positions);
    const positionsPrices = useSelector(state => state.positionPrice);
    const dispatch = useDispatch();

    const closePosition = useCallback(({ symbol, positionSide, quantity, type, id }) => {
        socket.emit('createOrder', { order: { symbol, positionSide, side: positionSide === 'LONG' ? 'SELL' : 'BUY', quantity, type, id } });
    }, [socket]);

    const closeOrder = useCallback(({ type, id, symbol }) => {
        socket.emit('closeOrder', { type, id, symbol });
    }, [socket]);

    useEffect(() => {
        const handlePositionPrices = (data) => {
            dispatch({ type: 'FILTERED_POSITION_PRICE', payload: { ...positionsPrices, [data[0]]: data[1] } });
        };

        socket.on("positionPrices", handlePositionPrices);
        return () => socket.off("positionPrices", handlePositionPrices);
    }, [socket, dispatch, positionsPrices]);

    const columns = useMemo(() => [
        {
            title: '',
            dataIndex: 'createdAt',
            key: 'name',
            align: 'center',
            width: '70px',
            render: (_,record) =>
                <>
                    {dayjs(record?.createdAt).tz(userTimezone).format('DD.MM.YYYY')}
                    <br/>
                    {dayjs(record?.createdAt).tz(userTimezone).format('HH:mm:ss')}
                    <br/>
                    <a target="_blank" href={`${url}/api/v1/logs/${record?.positionsId}`} style={{fontSize: '14px'}}>Logs</a>
                </>,
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
                <span style={{ color: record.positionData.positionSide === 'LONG' ? "rgb(14, 203, 129,0.8)" : "rgba(246, 70, 93, 0.8)" }}>
          {record.positionData.positionSide === 'LONG' ? 'ВВЕРХ' : 'ВНИЗ'}
        </span>
        },
        {
            title: 'Плечо',
            dataIndex: 'leverage',
            key: 'leverage',
            align: 'center',
            width: '160px',
            render: leverage => <div style={{fontSize: '18px'}}>x{leverage}</div>,
        },
        {
            title: 'Сумма',
            dataIndex: 'positionData',
            key: 'origQty',
            align: 'center',
            width: '200px',
            render: (_, record) => {
                const leverage = parseFloat(record?.leverage);
                const cumQuote = parseFloat(record?.positionData?.cumQuote);
                const origQty = parseFloat(record?.positionData?.origQty);
                return leverage > 1
                    ? `${(cumQuote / leverage).toFixed(2)}/${cumQuote.toFixed(2)} (${origQty})`
                    : `${(cumQuote / leverage).toFixed(2)} (${origQty})`;
            },
        },
        {
            title: '',
            dataIndex: 'currency',
            key: 'currency_2',
            align: 'center',
            width: '400px',
            render: (_, record) => {
                const price = positionsPrices[record?.positionData?.symbol];
                if (isNaN(price) || !price) return <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />;

                const { positionSide, origQty } = record.positionData;
                const startPrice = parseFloat(record?.startPrice);
                const leverage = parseFloat(record?.leverage);
                const commission = parseFloat(record?.openedConfig?.commission);

                const precent = origQty * price * commission;
                const priceDiff = positionSide === 'LONG' ? price - startPrice : startPrice - price;
                const profit = ((priceDiff * origQty) - (precent + parseFloat(record?.commission))).toFixed(2);
                const procent = ((priceDiff / startPrice) * 100 * leverage - (precent + parseFloat(record?.commission))).toFixed(2);

                const fixProfit = record?.ordersId?.withoutLoss?.fix && !record?.ordersId?.TRAILING_STOP_MARKET?.fix
                    ? parseFloat(record?.ordersId?.withoutLoss?.fixedPrice)
                    : record?.ordersId?.TRAILING_STOP_MARKET?.fix
                        ? record?.ordersId?.TRAILING_STOP_MARKET?.price
                        : record?.ordersId?.TAKE_PROFIT_MARKET
                            ? (((record?.ordersId?.TAKE_PROFIT_MARKET?.stopPrice - startPrice) * parseFloat(record?.openedConfig?.quantity))).toFixed(2)
                            : 0;

                return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gridTemplateRows: 'repeat(2, 1fr)',
                            gridColumnGap: '12px',
                            gridRowGap: '20px',
                            width: 'fit-content'
                        }}>
                            <div style={{ display: 'flex', gridArea: '1 / 1 / 3 / 2' }}>
                                <PriceDisplay price={price} startPrice={startPrice} />
                            </div>
                            <ProfitDisplay profit={profit} procent={procent} fixProfit={fixProfit} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '30px' }}>
                            <OrderTimeline ordersId={record?.ordersId} />
                        </div>
                    </div>
                );
            },
        },
        Table.EXPAND_COLUMN,
    ], [userTimezone, positionsPrices, closePosition, closeOrder]);

    const renderExpandedRow = useCallback((record) => (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                {record?.ordersId?.TAKE_PROFIT_MARKET && !record?.ordersId?.macd && !record?.ordersId?.withoutLoss && (
                    <Button type='primary' style={{ background: 'none', border: '1px solid', marginRight: '16px' }}
                            onClick={() => closeOrder({ symbol: record?.currency, id_order: record?.ordersId?.TAKE_PROFIT_MARKET?.orderId, id: record.key })}>
                        Отключить Take Profit
                    </Button>
                )}
                {record?.ordersId?.withoutLoss && !record?.ordersId?.macd && (
                    <Button type='primary' style={{ background: 'none', border: '1px solid', marginRight: '16px' }}
                            onClick={() => closeOrder({ type: 'withoutLoss', symbol: record?.currency, id: record.key })}>
                        Отключить БУ
                    </Button>
                )}
                {record?.ordersId?.TRAILING_STOP_MARKET && (
                    <Button type='primary' style={{ background: 'none', border: '1px solid', marginRight: '16px' }}
                            onClick={() => closeOrder({ type: 'trailing', symbol: record?.currency, id: record.key })}>
                        Отключить Trailing
                    </Button>
                )}
                {record?.ordersId?.macd && !record?.ordersId?.TAKE_PROFIT_MARKET && !record?.ordersId?.withoutLoss && (
                    <Button type='primary' style={{ background: 'none', border: '1px solid', marginRight: '16px' }}
                            onClick={() => closeOrder({ ...record.openedConfig, id: record.key })}>
                        Отключить macd
                    </Button>
                )}
                <Button danger onClick={() => closePosition({ ...record.openedConfig, id: record?.positionData?.orderId })}>
                    Закрыть позицию
                </Button>
            </div>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gridTemplateRows: '1fr',
                gridColumnGap: '10px',
                gridRowGap: '10px',
                marginTop: '10px'
            }}>
        <span style={{ margin: '0 auto' }}>
          Комиссия открытия: {parseFloat(record?.commission).toFixed(6)}
            <br/>
          Комиссия закрытия: {((record?.positionData?.origQty * parseFloat(positionsPrices[record?.positionData?.symbol])) * record?.openedConfig?.commission).toFixed(6)}
        </span>
                {record?.ordersId?.withoutLoss?.orderId && (
                    <span style={{ margin: '0 auto' }}>
            <h4 style={{ color: '#fff', margin: '0 0 4px' }}>БУ</h4>
            Фикс цена: {parseFloat(record?.ordersId?.withoutLoss?.fixedPrice).toFixed(6)}
                        <br/>
            MIN отклонение: {parseFloat(record?.ordersId?.withoutLoss?.minDeviation).toFixed(6)}
                        <br/>
            MAX отклонение: {parseFloat(record?.ordersId?.withoutLoss?.maxDeviation).toFixed(6)}
          </span>
                )}
                {record?.ordersId?.TRAILING_STOP_MARKET?.orderId && (
                    <span style={{ margin: '0 auto' }}>
            <h4 style={{ color: '#fff', margin: '0 0 4px' }}>CH</h4>
            Фикс: {JSON.stringify(record?.ordersId?.TRAILING_STOP_MARKET?.arrayPrice)}
                        <br/>
            Отклонение: {JSON.stringify(record?.ordersId?.TRAILING_STOP_MARKET?.arrayDeviation)}
          </span>
                )}
            </div>
        </div>
    ), [closeOrder, closePosition, positionsPrices]);

    return (
        <div style={{ width: '100%', background: '#0E0E0E' }}>
            {positions && positions.length > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto', width: '100%' }}>
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
                            dataSource={positions}
                            pagination={false}
                            expandable={{
                                expandedRowRender: renderExpandedRow,
                            }}
                        />
                    </ConfigProvider>
                </div>
            ) : (
                <div style={{ width: '100%', textAlign: 'center', color: '#fff' }}>Нет открытых позиций</div>
            )}
        </div>
    );
};

export default memo(PositionActive);