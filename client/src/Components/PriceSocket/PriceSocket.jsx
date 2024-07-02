import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { BINANCE_API, BINANCE_SOCKET_API, BINANCE_TEST_API, BINANCE_TEST_SOCKET_API } from "../../Config.jsx";

const SocketContextPrice = createContext();

export const usePrice = () => useContext(SocketContextPrice);

export const SocketPrice = ({ children }) => {
    const symbol = useSelector(state => state.symbol);
    const type_binance = useSelector(state => state.type_binance) ? true : false;
    const dispatch = useDispatch();
    const [priceUpdates, setPriceUpdates] = useState({ price: 0, position: true, symbol: symbol });
    const [currenctPrice, setCurrenctPrice] = useState('');
    const socketPrice = useSelector(state => state.socketPrice);

    const wsRef = useRef(null);

    useEffect(() => {

        if (!symbol || type_binance === null) {
            setPriceUpdates({ price: 0, position: true, symbol: symbol });
            return;
        }

        const wsUrl = `wss://${type_binance ? BINANCE_TEST_SOCKET_API : BINANCE_SOCKET_API}/ws/${symbol.toLowerCase()}@trade`;
        const httpUrl = `https://${type_binance ? BINANCE_TEST_API : BINANCE_API}/fapi/v2/ticker/price?symbol=${symbol}`;

        const connectWebSocket = () => {
            try {
                console.log(wsUrl)
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onopen = () => {
                    console.log(`[ONOPEN] Open price socket ${symbol}`);
                    setCurrenctPrice(symbol)
                    axios.get(httpUrl).then((response) => {
                        const p = response.data.price;
                        updatePrice(p);
                    }).catch(error => console.error('Error fetching initial price:', error));
                };

                ws.onmessage = event => {
                    const { p, s } = JSON.parse(event.data);
                    if (symbol === s) {
                        updatePrice(p);
                    }
                };

                ws.onclose = () => {
                    console.log(`[ONCLOSE] Close price socket ${symbol}`);

                    if(symbol === currenctPrice)
                        setTimeout(connectWebSocket, 500);
                };

                ws.onerror = error => {
                    console.error('WebSocket error:', error);
                    ws.close();
                };
            } catch (e){
                console.error(e)
            }
        };

        const updatePrice = (newPrice) => {
            const strNumber = newPrice.toString();
            const decimalIndex = strNumber.indexOf('.');
            const formattedPrice = decimalIndex !== -1 && decimalIndex !== 1 ? parseFloat(newPrice).toFixed(3) : parseFloat(newPrice);

            setPriceUpdates(prevState => ({
                price: formattedPrice,
                position: parseFloat(formattedPrice) >= parseFloat(prevState.price),
                symbol: symbol
            }));
        };

        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [symbol, type_binance]);

    return (
        <SocketContextPrice.Provider value={priceUpdates}>
            {children}
        </SocketContextPrice.Provider>
    );
};
