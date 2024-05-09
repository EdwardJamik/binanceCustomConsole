import React, {useEffect} from 'react'
import {useSelector} from "react-redux"
import {Navigate, useLocation, useNavigate} from "react-router-dom"

const ProtectedRoute = ({children}) => {
    let location = useLocation();
    const navigate = useNavigate();
    const {pathname} = useLocation();
    const page = pathname.replace("/", "");

    const user = useSelector((state) => state.user);

    useEffect(() => {
        if(!user?.isAuthenticated && page !== 'sign-in') {
            navigate('/sign-in')
        } else if(user?.isAuthenticated && page === 'sign-in') {
            navigate('/')
        }
    }, [user?.isAuthenticated]);

    if(!user?.isAuthenticated && page !== 'sign-in') {
        return <Navigate to="/sign-in" state={{ from: location}} replace />
    }

    return children

};

export default ProtectedRoute;