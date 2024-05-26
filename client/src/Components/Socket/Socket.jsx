import React, {createContext, useContext, useEffect} from 'react';
import io from 'socket.io-client';
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import {useCookies} from "react-cookie";
import {useDispatch} from "react-redux";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {

    const [cookies, removeCookie] = useCookies();
    const dispatch = useDispatch();

    let mainSocket = cookies?.token ? io.connect("http://localhost:5050") : false

    useEffect(() => {
        if (mainSocket) {
            mainSocket.emit('authenticate', {token: cookies.token});
        } else {
            dispatch({type: 'SET_AUTHENTICATION_STATUS', payload: false});
        }
    }, [cookies]);


    useEffect(() => {
        if (mainSocket) {
            mainSocket.on("userMessage", (data) => {
                if (data.type === 'error')
                    openNotificationWithIcon('error', 'Error', data.message);
                else if (data.type === 'warning')
                    openNotificationWithIcon('warning', 'Warning', data.message);
                else if (data.type === 'success')
                    openNotificationWithIcon('success', 'Success', data.message);
            });

            mainSocket.on("userData", (data) => {
                dispatch({type: 'SET_AUTHENTICATION_STATUS', payload: data.auth});
                if (data.currentOption)
                    dispatch({type: 'SET_USER_DATA', payload: data.currentOption});

                if (data.symbol)
                    dispatch({type: 'SET_SYMBOL', payload: data.symbol});

                if (data.binance_test)
                    dispatch({type: 'SET_TYPE_BINANCE', payload: data.binance_test});

            });

            mainSocket.on("updatePosition", (data) => {
                dispatch({type: 'FILTERED_POSITION', payload: data.positionList});
            });

            mainSocket.on("userBalance", (data) => {
                dispatch({type: 'FILTERED_BALANCE', payload: data});
            });

            mainSocket.on("updatePositionBefore", (data) => {
                console.log(data)
                dispatch({type: 'FILTERED_POSITION_BEFORE', payload: data.positionList});
            });

            mainSocket.on("updatePositionCreated", (data) => {
                dispatch({type: 'CURRENT_POSITION', payload: data.positionList});
            });

            mainSocket.on("updateMinPrice", (data) => {
                dispatch({type: 'FILTERED_CURRENCY_PRICE', payload: data});
            });

            mainSocket.on("updateCommission", (data) => {
                dispatch({type: 'FILTERED_COMMISSION', payload: data});
            });

        }
    }, [mainSocket]);


    return (
        <SocketContext.Provider value={mainSocket}>
            {children}
        </SocketContext.Provider>
    );
};
