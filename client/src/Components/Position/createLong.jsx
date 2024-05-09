import React from 'react';
import {Button, ConfigProvider} from "antd";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";

const CreateLong = () => {

    const openLong = () =>{
        openNotificationWithIcon('error', 'Не удалось открыть позицию', 'Error: Way too many requests; IP banned until 1532118492680. Please use the websocket for live updates to avoid bans.');

    }
    return (
        <div>
            <ConfigProvider
                theme={{
                    components: {
                        Button: {
                            colorPrimary: `rgb(14, 203, 129)`,
                            fontWeight:'600',
                            colorPrimaryHover: `rgb(14, 203, 129,0.8)`,
                            colorPrimaryActive: `rgb(14, 203, 129,0.8)`,
                            lineWidth: 0,
                        },
                    },
                }}
            >
                <Button style={{width:'160px',height:'50px'}} type="primary" size="large" onClick={()=>openLong()}>
                    Open Long
                </Button>
            </ConfigProvider>
        </div>
    );
};

export default CreateLong;