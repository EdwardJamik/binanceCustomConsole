import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import store from './Redux/store.js'
import { BrowserRouter } from "react-router-dom";
import {Provider} from "react-redux";
import {SocketProvider} from "./Components/Socket/Socket.jsx";
import {SocketPrice} from "./Components/PriceSocket/PriceSocket.jsx";

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <Provider store={store}>
        <BrowserRouter>
            <SocketProvider>
                <SocketPrice>
                    <App />
                </SocketPrice>
            </SocketProvider>
        </BrowserRouter>
    </Provider>
);