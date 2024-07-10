import React, {createContext, useContext, useEffect, useState} from 'react';
import {io} from 'socket.io-client';
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import {useCookies} from "react-cookie";
import {useDispatch} from "react-redux";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
    const [cookies, removeCookie] = useCookies();
    const [socket, setSocket] = useState(null);
    const dispatch = useDispatch();

    useEffect(() => {
        const mainSocket = io(`${import.meta.env.VITE_SOCKET_API}`, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        mainSocket.on('connect', () => {
            console.log('Connected to server');
        });

        mainSocket.on('disconnect', (reason) => {
            console.log('Disconnected:', reason);
            if (reason === 'io server disconnect') {
                mainSocket.connect();
            }
        });

        mainSocket.on('connect_error', (error) => {
            console.log('Connection error:', error);
            openNotificationWithIcon('error', 'Connection Error', 'Failed to connect to the server');
        });

        setSocket(mainSocket);

        return () => {
            mainSocket.disconnect();
        };
    }, []);

    // Обробка подій сокета
    useEffect(() => {
        if (socket) {
            if(cookies.token) {
                socket.emit('authenticate', {token: cookies.token});
            }

            socket.on("userMessage", (data) => {
                if (data.type === 'error')
                    openNotificationWithIcon('error', 'Error', data.message);
                else if (data.type === 'warning')
                    openNotificationWithIcon('warning', 'Warning', data.message);
                else if (data.type === 'success')
                    openNotificationWithIcon('success', 'Success', data.message);
            });

            socket.on("cookie-set", ({token}) => {
                document.cookie = `token=${token}; max-age=${3 * 24 * 60 * 60}; path=/`;
            });

            socket.on("userData", (data) => {
                if(data.auth)
                    dispatch({type: 'SET_AUTHENTICATION_STATUS', payload: data.auth});

                if (data)
                    dispatch({type: 'SET_USER_DATA', payload: data});
            });

            socket.on("updatePosition", (data) => {
                dispatch({type: 'FILTERED_POSITION', payload: data.positionList});
            });

            socket.on("userBalance", (data) => {
                dispatch({type: 'FILTERED_BALANCE', payload: data});
            });

            socket.on("updatePositionBefore", (data) => {
                dispatch({type: 'FILTERED_POSITION_BEFORE', payload: data.positionList});
            });

            socket.on("updatePositionCreated", (data) => {
                dispatch({type: 'CURRENT_POSITION', payload: data.positionList});
            });

            socket.on("updateOnePosition", (data) => {
                dispatch({type: 'ONE_POSITION', payload: data.positionList});
            });

            socket.on("updateMinPrice", (data) => {
                dispatch({type: 'FILTERED_CURRENCY_PRICE', payload: data});
            });

            socket.on("updateCommission", (data) => {
                dispatch({type: 'FILTERED_COMMISSION', payload: data});
            });

            return () => {
                socket.off("userMessage");
                socket.off("cookie-set");
                socket.off("userData");
                socket.off("updatePosition");
                socket.off("userBalance");
                socket.off("updatePositionBefore");
                socket.off("updatePositionCreated");
                socket.off("updateOnePosition");
                socket.off("updateMinPrice");
                socket.off("updateCommission");
            };
        }
        // else {
        //     dispatch({type: 'SET_AUTHENTICATION_STATUS', payload: false});
        // }
    }, [socket, cookies, dispatch]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};