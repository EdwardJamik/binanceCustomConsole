import React, {createContext, useContext, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {BINANCE_API, BINANCE_SOCKET_API, BINANCE_TEST_API, BINANCE_TEST_SOCKET_API} from "../../Config.jsx";
import axios from "axios";

const SocketContextPrice = createContext();

export const usePrice = () => useContext(SocketContextPrice);

export const SocketPrice = ({ children }) => {

    const symbol = useSelector(state => state.symbol);
    const currency = useSelector(state => state.currentOption.currency);
    const dispatch = useDispatch();
    const [priceUpdates, setPriceUpdates] = useState({ price: 0, position: true, symbol: symbol });
    const type_binance = useSelector(state => state.type_binance);

    const wsRef = useRef(null);

    useEffect(() => {

        if (symbol !== null && type_binance !== null) {

            const ws = new WebSocket(`wss://${type_binance ? BINANCE_TEST_SOCKET_API : BINANCE_SOCKET_API}/ws/${symbol.toLowerCase()}@trade`);
            wsRef.current = ws;
            let keepAliveIntervalId;

            ws.onopen = () => {
                console.log(`[ONOPEN] Open price socket`);
                axios.get(`https://${type_binance ? BINANCE_TEST_API : BINANCE_API}/fapi/v2/ticker/price?symbol=${symbol}`).then((response) => {
                    const p = response.data.price;
                    const strNumber = p.toString();
                    const decimalIndex = strNumber.indexOf('.');

                    setPriceUpdates(prevState => ({
                        price: decimalIndex !== -1 && decimalIndex !== 1 ? parseFloat(p).toFixed(3) : parseFloat(p),
                        position: parseFloat(p) >= parseFloat(prevState.price)
                    }));

                    dispatch({ type: 'FILTER_CURRENCY_PRICE', payload: parseFloat(p) });
                });
            };

            ws.onclose = () => {
                console.log(`[ONCLOSE] Close price socket`);
                if(symbol !== null && wsRef.current === ws){
                    const newWS = new WebSocket(`wss://${type_binance ? BINANCE_TEST_SOCKET_API : BINANCE_SOCKET_API}/ws/${symbol.toLowerCase()}@trade`);
                    wsRef.current = newWS;
                    keepAliveIntervalId = ''
                    console.log(`[ONCLOSE - RECCONECTED] Close price socket`);
                }
            };

            ws.onmessage = event => {
                const { p, s } = JSON.parse(event.data);
                const strNumber = String(p);
                const decimalIndex = strNumber.indexOf('.');

                if (symbol === s) {

                    setPriceUpdates(prevState => ({
                        price: decimalIndex !== -1 && decimalIndex !== 1 ? parseFloat(p).toFixed(3) : parseFloat(p),
                        position: parseFloat(p) >= parseFloat(prevState.price)
                    }));

                    dispatch({ type: 'FILTER_CURRENCY_PRICE', payload: parseFloat(p) });
                } else if (s !== symbol) {
                    axios.get(`https://${type_binance ? BINANCE_TEST_API : BINANCE_API}/fapi/v2/ticker/price?symbol=${symbol}`).then((response) => {
                        const p = response.data.price;
                        const strNumber = p.toString();
                        const decimalIndex = strNumber.indexOf('.');

                        setPriceUpdates(prevState => ({
                            price: decimalIndex !== -1 && decimalIndex !== 1 ? parseFloat(p).toFixed(3) : parseFloat(p),
                            position: parseFloat(p) >= parseFloat(prevState.price)
                        }));

                        dispatch({ type: 'FILTER_CURRENCY_PRICE', payload: parseFloat(p) });
                    });
                    ws.close();
                }

                keepAliveIntervalId = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'keepalive' }));
                    }
                }, 30000);
            };

            // Очищення при розмонтаженні компонента або зміні символу
            return () => {
                if (wsRef.current) {
                    wsRef.current.close();
                }
                // Очищуємо інтервал "keep-alive"
                if (keepAliveIntervalId) {
                    clearInterval(keepAliveIntervalId);
                }
            };
        } else {
            setPriceUpdates({ price: 0, position: true, symbol: symbol });
        }
    }, [symbol,type_binance!==null]);


    return (
        <SocketContextPrice.Provider value={priceUpdates}>
            {children}
        </SocketContextPrice.Provider>
    );
};
