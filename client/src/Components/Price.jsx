import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";

const Price = () => {
    const dispatch = useDispatch();

    const [priceUpdates, setPriceUpdates] = useState({price:0, position:true});
    const symbol = useSelector(state => state.currentOption.currency)

    useEffect(() => {
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`);

        ws.onopen = () => {
            console.log('Connected to server');
        };

        ws.onmessage = event => {
            const {p} = JSON.parse(event.data)
            setPriceUpdates(prevState => ({
                price: parseFloat(p).toFixed(2),
                position: parseFloat(p) >= parseFloat(prevState.price)
            }))
            dispatch({ type: 'FILTER_CURRENCY_PRICE', payload: parseFloat(p) });
        };

        return () => {
            ws.close();
        };
    }, [symbol]);

    return (
        <div className="dashboard_item" style={{maxWidth:'200px', height:'100%',fontSize:"20px",fontWeight:'bold',color:priceUpdates?.position ? "rgb(14, 203, 129)" : "rgb(246, 70, 93)"}}>
            {priceUpdates?.price}
        </div>
    );
};

export default Price;