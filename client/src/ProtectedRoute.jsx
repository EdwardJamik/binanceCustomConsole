import React, {useEffect, useState} from 'react'
import {useSelector} from "react-redux"
import {Navigate, useLocation, useNavigate} from "react-router-dom"
import {useCookies} from "react-cookie";

const ProtectedRoute = ({children}) => {
    let location = useLocation();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const page = pathname.replace("/", "");
    const [cookies, removeCookie] = useCookies();
    const [preloader, setPreloader] = useState(false);
    const isAuthenticated = useSelector((state) => state.isAuthenticated);

    function checkCookie(name) {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(name + '=') === 0) {
                return true;
            }
        }
        return false;
    }

    useEffect(() => {
        if(isAuthenticated === null && !cookies?.token && !checkCookie('token')) {
            navigate('/sign-in')
            setPreloader(true)
        } else if(isAuthenticated && page === 'sign-in' && cookies?.token && checkCookie('token')) {
            navigate('/')
            setPreloader(true)
        } else if(isAuthenticated === false){
            navigate('/sign-in')
            setPreloader(true)
        }
    }, [isAuthenticated]);

    if(!isAuthenticated && page !== 'sign-in') {
        return <Navigate to="/sign-in" state={{ from: location}} replace />
    }

    if (preloader === false) {
        return <div id="preloader">
            <div id="loader"></div>
        </div>;
    }

    return children

};

export default ProtectedRoute;