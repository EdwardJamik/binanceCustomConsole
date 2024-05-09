import React, { createContext, useContext } from 'react';
import { openNotificationWithIcon } from './NotificationService.jsx';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
    return (

            <NotificationContext.Provider value={{openNotificationWithIcon}}>
                {children}
            </NotificationContext.Provider>
    );
};
