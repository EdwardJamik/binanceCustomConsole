import React, {createContext, useContext, useEffect} from 'react';
import {io} from 'socket.io-client';
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import {useCookies} from "react-cookie";
import {useDispatch} from "react-redux";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {

    const [cookies, removeCookie] = useCookies();
    const dispatch = useDispatch();

    let mainSocket = io.connect(`${import.meta.env.VITE_SOCKET_API}`)

    useEffect(() => {
        if (mainSocket) {
            if(cookies.token)
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

            mainSocket.on("cookie-set", ({token}) => {
                document.cookie = `token=${token}; max-age=${3 * 24 * 60 * 60}; path=/`;
            });

            mainSocket.on("userData", (data) => {

                if(data.auth)
                    dispatch({type: 'SET_AUTHENTICATION_STATUS', payload: data.auth});

                if (data)
                    dispatch({type: 'SET_USER_DATA', payload: data});
            });

            mainSocket.on("updatePosition", (data) => {
                dispatch({type: 'FILTERED_POSITION', payload: data.positionList});
            });

            mainSocket.on("userBalance", (data) => {
                dispatch({type: 'FILTERED_BALANCE', payload: data});
            });

            mainSocket.on("updatePositionBefore", (data) => {
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
