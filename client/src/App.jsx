import React, {useEffect} from 'react';
import { Route, Routes } from 'react-router-dom';
import Home from "./Page/Home/Home.jsx";
import SignIn from "./Page/SignIn/SignIn.jsx";
import Main from "./Components/Layout/Main.jsx";
import { Suspense } from "react";
import { NotificationProvider } from "./Components/Notification/NotificationContext.jsx";

import "./Assets/Styles/main.css";
import "./Assets/Styles/responsive.css";
import ProtectedRoute from "./ProtectedRoute.jsx";
import {fetchAuthenticationStatus} from "./Redux/actions.js";
import {useDispatch} from "react-redux";
import Setting from "./Page/Setting/Setting.jsx";

function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        fetchAuthenticationStatus();
    }, [dispatch]);

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
