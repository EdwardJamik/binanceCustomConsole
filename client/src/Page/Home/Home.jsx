import React from 'react';
import './home.css'
import {useLocation} from "react-router-dom";
import CreateLong from "../../Components/Position/createLong.jsx";
import CreateShort from "../../Components/Position/createShort.jsx";
import Currency from "../../Components/Currency/Currency.jsx";
import DateTime from "../../Components/Date/DateTime.jsx";
import {ConfigProvider, Tabs} from "antd";
import PositionActive from "../../Components/FeedBackPosition/PositionActive.jsx";
import PositionBefore from "../../Components/FeedBackPosition/PositionBefore.jsx";
import CreatePosition from "../../Components/Position/CreatePosition.jsx";

const Home = () => {
    const {pathname} = useLocation();
    const page = pathname.replace("/", "");

    return (
        <>
        <div
            className='mainDashboard'
            style={{
                borderRadius: page !== "" ? '30px' : "",
                // background:'#0E0E0E',
            }}
        >
            <>
                {/*<Profit/>*/}
                <DateTime/>
                <div className='mainSettings'>
                    <div className='block'>
                        <Currency/>
                        {/*<Leverage/>*/}
                        {/*<Trend/>*/}
                    </div>
                    {/*<div className='block'>*/}
                    {/*<Price/>*/}
                    {/*<AmountPosition/>*/}
                    {/*</div>*/}
                    {/*amount*/}
                    {/*<Price/>*/}
                    {/*<Currency/>*/}
                </div>
                <div className="controllButton">
                    <CreatePosition/>
                </div>

            </>
        </div>
            <div
                className='mainDashboard'
                style={{
                    borderRadius: '30px',
                    marginTop:'30px',
                    background:'#0E0E0E',
                    overflow:'auto'
                }}
            >

                <ConfigProvider
                theme={{
                    components: {
                        Tabs: {
                            fontSize:16,
                            fontWeight:600,
                            cardPadding:'20px 10px',
                            colorTextBase: '#fff',
                            itemColor:'#fff',
                            colorBorder: '#0E0E0E',
                            controlOutline: 'none',
                            colorBgElevated: '#131313',
                            colorBgContainer: '#0E0E0E',
                            colorPrimary: 'rgba(240, 216, 90, 0.8)',
                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',

                        },
                    },
                }}
            >
                        <Tabs
                            defaultActiveKey="1"
                            centered
                            items={
                                [
                                    {
                                        label: `Активные`,
                                        key: 1,
                                        children: <PositionActive/>,
                                    },
                                    {
                                        label: `Выполнены`,
                                        key: 2,
                                        children: <PositionBefore/>,
                                    }
                                ]

                            }
                        />
            </ConfigProvider>
            </div>
        </>
    );
};

export default Home;