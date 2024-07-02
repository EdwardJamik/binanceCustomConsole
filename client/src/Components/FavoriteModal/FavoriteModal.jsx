import React from 'react';
import {Button} from "antd";

const FavoriteModal = () => {
    return (
        <>
            <Button
                type={'primary'}
                ghost
                danger
                style={{
                    zIndex:'9',
                    maxWidth: '100%',
                    width: '24px',
                    padding: '0',
                    marginRight: '6px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color:'rgba(240, 216, 90, 0.4)',
                    borderColor:'rgba(240, 216, 90, 0.4)'
                }}
            >
                +
            </Button>
        </>
    );
};

export default FavoriteModal;