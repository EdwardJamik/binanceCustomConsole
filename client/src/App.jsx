import React, {useEffect, useState} from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from "./Page/Home/Home.jsx";
import SignIn from "./Page/SignIn/SignIn.jsx";
import Main from "./Components/Layout/Main.jsx";
import { Suspense } from "react";
import { NotificationProvider } from "./Components/Notification/NotificationContext.jsx";

import "./Assets/Styles/main.css";
import "./Assets/Styles/responsive.css";
import ProtectedRoute from "./ProtectedRoute.jsx";
import {useDispatch, useSelector} from "react-redux";
import Setting from "./Page/Setting/Setting.jsx";
import {useCookies} from "react-cookie";
import { useSocket} from "./Components/Socket/Socket.jsx";



function App() {
    const [preloader, setPreloader] = useState(false);
    const userAuth = useSelector(state => state.user.isAuthenticated);

    useEffect(() => {
        if(userAuth !== null)
            setPreloader(true)
    }, [userAuth]);

    const routes = [
        {
            link: '/sign-in',
            element: <ProtectedRoute><SignIn/></ProtectedRoute>,
        },

        {
            link: '/',
            element: <ProtectedRoute><Main><Home/></Main></ProtectedRoute>,
        },
        {
            link: '/settings',
            element: <ProtectedRoute><Main><Setting/></Main></ProtectedRoute>,
        },
        {
            link: '*',
            element: <ProtectedRoute><Main><Home/></Main>,</ProtectedRoute>
        },
    ];

    if (preloader === false) {
        return <div id="preloader">
            <div id="loader"></div>
        </div>;
    }

    return (
        <div className="App">

                <NotificationProvider>
                    <Routes>
                        {routes.map(route => (
                            <Route
                                key={route.link}
                                path={route.link}
                                element={
                                    <Suspense fallback={<div>Loading...</div>}>
                                        {route.element}
                                    </Suspense>
                                }
                            />
                        ))}
                    </Routes>
                </NotificationProvider>
        </div>
    );
}

export default App;