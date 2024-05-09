import React, {useEffect, useState} from 'react';
import {Button, ConfigProvider, Form, Input} from "antd";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import axios from "axios";
import {url} from "../../Config.jsx";
import {useDispatch} from "react-redux";

const AccountSetting = () => {
    const dispatch = useDispatch();
    const [form] = Form.useForm();
    const [isUser, setUser] = useState(null)

    const userLogout = () => {
        setTimeout(() => {
            dispatch({ type: 'SET_AUTHENTICATION_STATUS', payload: false });
        }, 5000);
    };

    const onFinishSetting = async (values) => {
        if(values.account_password === values.account_repeat_password && (values.account_password).length >= 8 ){
            axios.post(`${url}/api/v1/changeAccountData`, {...values}, {withCredentials: true}).then(({data}) => {
                if (data.status) {
                    openNotificationWithIcon(data.success ? 'success' : 'error', data.success ? 'Success' : 'Error', data?.message);
                    userLogout()
                } else if(data && data.message) {
                    openNotificationWithIcon(data.success ? 'success' : 'error', data.success ? 'Success' : 'Error', data?.message);
                }
            }).catch((error) => {
                openNotificationWithIcon('error', 'Error', error.message);
            });
        } else{
            if((values.account_password).length < 8)
                openNotificationWithIcon('error', 'Error', 'Password must contain 8 or more characters');
            else
                openNotificationWithIcon('error', 'Error', 'Passwords do not match');
        }
    };

    useEffect(() => {
        axios.post(`${url}/api/v1/getUserData`, {}, {withCredentials: true}).then(({data}) => {
            if (data && data.status) {
                setUser({...data})
            } else if(data && data.message){
                openNotificationWithIcon('warning', 'Warning', data.message);
            }
        }).catch((error) => {
            openNotificationWithIcon('error', 'Error', error.message);
        });
    }, []);

    return (
        <div className='otherSettings'>
            {isUser !== null &&
               (    <Form
                        form={form}
                        onFinish={onFinishSetting}
                        initialValues={isUser}
                    >

                        <div className='login' style={{position: 'relative'}}>
                            <div>
                                <span className="gold">Login</span>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Form.Item
                                        name="login"

                                        rules={[
                                            {

                                                required: true,
                                                message: "Enter your login",
                                            },
                                        ]}
                                    >
                                        <Input name="login" placeholder="Login"
                                               style={{
                                                   height: '48px',
                                                   width: '100%',
                                                   border: '1px solid rgba(255,255,255,0.2)'
                                               }}/>
                                    </Form.Item>
                                </ConfigProvider>
                            </div>
                        </div>
                        <Form.Item
                            name="account_password"
                            rules={[
                                {
                                    required: true,
                                    message: "Enter your password",
                                },
                            ]}
                        >
                            <div className="account_password" style={{position: 'relative'}}>
                                <span className="gold">Password</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Input.Password name="account_password" placeholder="Password" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                </ConfigProvider>

                            </div>
                        </Form.Item>
                        <Form.Item
                            name="account_repeat_password"
                            rules={[
                                {
                                    required: true,
                                    message: "Repeat your password",
                                },
                            ]}
                        >
                            <div className="account_repeat_password" style={{position: 'relative'}}>
                                <span className="gold">Repeat password</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Input.Password name="account_repeat_password" placeholder="Repeat Password" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                </ConfigProvider>

                            </div>
                        </Form.Item>

                        <Form.Item>
                            <ConfigProvider
                                theme={{
                                    token: {
                                        controlOutline: 'none',
                                        colorPrimary: '#000',
                                        colorPrimaryHover: 'rgba(240, 216, 90, 0.6)',
                                    },

                                }}
                            >
                                <Button
                                    type="primary"
                                    className='login_button'
                                    htmlType="submit"
                                    style={{
                                        display: 'block',
                                        width: "100%",
                                        maxWidth: '320px',
                                        margin: '100px auto 0',
                                        color: 'rgba(255,255,255,.8)'
                                    }}
                                >
                                    Save
                                </Button> </ConfigProvider>
                        </Form.Item>
                    </Form>)
            }{ isUser === null &&
                    (<Form
                        form={form}
                        onFinish={onFinishSetting}
                    >

                        <div className='login' style={{position: 'relative'}}>
                            <div>
                                <span className="gold">Login</span>
                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Form.Item
                                        name="login"

                                        rules={[
                                            {

                                                required: true,
                                                message: "Enter your login",
                                            },
                                        ]}
                                    >
                                        <Input name="login" placeholder="Login"
                                               style={{
                                                   height: '48px',
                                                   width: '100%',
                                                   border: '1px solid rgba(255,255,255,0.2)'
                                               }}/>
                                    </Form.Item>
                                </ConfigProvider>
                            </div>
                        </div>
                        <Form.Item
                            name="account_password"
                            rules={[
                                {
                                    required: true,
                                    message: "Enter your password",
                                },
                            ]}
                        >
                            <div className="account_password" style={{position: 'relative'}}>
                                <span className="gold">Password</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Input.Password name="account_password" placeholder="Password" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                </ConfigProvider>

                            </div>
                        </Form.Item>
                        <Form.Item
                            name="account_repeat_password"
                            rules={[
                                {
                                    required: true,
                                    message: "Repeat your password",
                                },
                            ]}
                        >
                            <div className="account_repeat_password" style={{position: 'relative'}}>
                                <span className="gold">Repeat password</span>

                                <ConfigProvider
                                    theme={{
                                        token: {
                                            colorTextBase: '#fff',
                                            colorBorder: '#0E0E0E',
                                            controlOutline: 'none',
                                            colorBgElevated: '#131313',
                                            colorBgContainer: '#0E0E0E',
                                            colorPrimary: 'rgba(240, 216, 90, 0.2)',
                                            colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                            colorPrimaryHover: 'rgba(240, 216, 90, 0.4)',
                                            colorFillTertiary: 'rgba(240, 216, 90, 0.6)',
                                        },

                                    }}
                                >
                                    <Input.Password name="account_repeat_password" placeholder="Repeat Password" style={{
                                        height: '48px',
                                        width: '100%',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}/>
                                </ConfigProvider>

                            </div>
                        </Form.Item>

                        <Form.Item>
                            <ConfigProvider
                                theme={{
                                    token: {
                                        controlOutline: 'none',
                                        colorPrimary: '#000',
                                        colorPrimaryHover: 'rgba(240, 216, 90, 0.6)',
                                    },

                                }}
                            >
                                <Button
                                    type="primary"
                                    className='login_button'
                                    htmlType="submit"
                                    style={{
                                        display: 'block',
                                        width: "100%",
                                        maxWidth: '320px',
                                        margin: '100px auto 0',
                                        color: 'rgba(255,255,255,.8)'
                                    }}
                                >
                                    Save
                                </Button> </ConfigProvider>
                        </Form.Item>

                    </Form>)
            }

        </div>

    );
};

export default AccountSetting;