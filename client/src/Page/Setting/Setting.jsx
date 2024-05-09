import React from 'react';
import {useLocation} from "react-router-dom";
import MainSetting from "../../Components/MainSetting/MainSetting.jsx";
import AccountSetting from "../../Components/AccountSetting/AccountSetting.jsx";

const Setting = () => {
    const {pathname} = useLocation();
    const page = pathname.replace("/", "");

    return (
        <div className='mainDashboard setting'
             style={{
                 borderRadius: page === "settings" ? '30px' : "",
             }}
        >
            <div>
                <h4 className='title gold'>Setting</h4>
                <MainSetting/>
            </div>
            <div>
                <h4 className='title gold'>Account data</h4>
                <AccountSetting/>
            </div>
        </div>
    );
};

export default Setting;