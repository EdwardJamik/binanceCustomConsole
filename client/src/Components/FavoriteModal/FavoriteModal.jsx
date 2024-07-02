import React, {useEffect, useState} from 'react';
import {Button, ConfigProvider, Input, Modal, Select, Switch} from "antd";
import axios from "axios";
import {url} from "../../Config.jsx";
import {EditOutlined} from "@ant-design/icons";
import {openNotificationWithIcon} from "../Notification/NotificationService.jsx";
import {useDispatch} from "react-redux";

const FavoriteModal = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCurrentEdit, setCurrentEdit] = useState(false);
    const [currencyList, setCurrencyList] = useState([]);
    const [isName, setName] = useState('');
    const [isCurrency, setCurrency] = useState([]);
    const [isFavorite, setFavorite] = useState([]);
    const [selectedFavorite, setselectedFavorite] = useState([]);
    const [selectedFavoriteObject, setselectedFavoriteObject] = useState(null);
    const dispatch = useDispatch();

    useEffect(() => {
        axios.post(`${url}/api/v1/info/getEditorCurrency/`, {},{withCredentials: true}).then((response) => {
            if (response) {
                setCurrency(response?.data?.pairs)
                setFavorite(response?.data?.favorite)
            }
        });
    }, [])

    const handleCurrencyChange = (value) => {
        setCurrencyList(value)
    };

    const handleFavoriteChange = (value) => {
        setselectedFavorite(value)

        axios.post(`${url}/api/v1/info/getFavoriteList/`, {id:value},{withCredentials: true}).then((response) => {
            if(response?.data) {
                setselectedFavoriteObject(response?.data)
            }
        });
    };

    const showModal = () => {
        setIsModalOpen(true);
        setName('')
        setCurrencyList([])
    };

    const handleOk = () => {

        let data
        if(!isCurrentEdit){
            data = {
                name:isName, list: currencyList, newFavorite:isCurrentEdit
            }
        } else{
            data = {
                name:selectedFavoriteObject?.name, list: selectedFavoriteObject?.list, newFavorite:isCurrentEdit, id:selectedFavorite
            }

        }
            axios.post(`${url}/api/v1/info/createNewCurrency/`, {...data},{withCredentials: true}).then((response) => {

                if (response) {
                    openNotificationWithIcon(response?.data?.status ? 'success' : 'warning', response?.data?.status ? 'Успешно' : 'Ошибка', response?.data?.message);
                }

                if(response?.data?.status) {
                    setName('')
                    setCurrencyList([])
                    dispatch({type: 'SET_FAVORITE', payload: response?.data?.value});
                    if(response?.data?.value)
                        setFavorite(response?.data?.value)
                }

                setIsModalOpen(!response?.data?.status);
            });
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };
    return (
        <>
            <Button
                type={'primary'}
                onClick={showModal}
                ghost
                danger
                style={{
                    zIndex: '9',
                    maxWidth: '100%',
                    width: '24px',
                    padding: '0',
                    marginRight: '6px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(240, 216, 90, 0.4)',
                    borderColor: 'rgba(240, 216, 90, 0.4)'
                }}
            >
                <EditOutlined />
            </Button>
            <ConfigProvider
                theme={{
                    token: {
                        colorTextSecondary: '#000',
                        colorTextLabel: '#000',
                        colorTextBase: '#fff',
                        optionFontSize: '20px',
                        colorPrimaryHover: 'none',
                        optionSelectedFontWeight: '600',
                        boxShadowSecondary: 'none',

                        colorBgContainer: 'none',
                        colorBorder: 'none',

                        colorBgBase:'rgba(0, 0, 0, 0.4)',


                        fontWeight: '600',
                        colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                        colorTextTertiary: '#000',
                        colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                    },
                }}
            >
                <Modal
                    title={
                    <>
                        {isCurrentEdit ? 'Редактор избранных' : 'Создание списка избранных'}
                        <Switch
                            style={{marginLeft:'10px'}}
                            checkedChildren="Редактирование"
                            unCheckedChildren="Создание"
                            checked={isCurrentEdit}
                            onChange={(checked) => {
                                setCurrentEdit(checked)
                            }}
                        />
                    </>}
                    open={isModalOpen}
                    onCancel={()=>handleCancel()}
                    footer={<>
                        <Button type={'primary'} ghost onClick={()=>handleCancel()}>Закрыть</Button>
                        <Button type={'primary'} onClick={()=>handleOk()}>{isCurrentEdit ? 'Изменить' : 'Создать'}</Button>
                    </>}
                >

                    {isCurrentEdit ?
                        <>
                            <p>
                                <h4 style={{color: '#fff', fontWeight: '400', marginBottom: '6px'}}>Выберите группу избранных для редактирования</h4>
                                <Select
                                    className='currency_selector'
                                    showSearch
                                    style={{
                                        width: '100%'
                                    }}
                                    value={selectedFavorite}
                                    dropdownStyle={{
                                        background: 'rgba(7, 7, 7, 0.6)',
                                        border: 'none',
                                        padding: '10px 8px 10px',
                                        textAlign: 'center',
                                    }}
                                    placeholder="Выберите валютные пары"
                                    filterOption={(input, option) =>
                                        option?.label.toLowerCase().includes(input.toLowerCase())
                                    }
                                    filterSort={(optionA, optionB) =>
                                        (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                    }
                                    onChange={handleFavoriteChange}
                                    options={isFavorite}
                                />
                            </p>
                            {selectedFavoriteObject?.name && selectedFavoriteObject?.list ?
                                <>
                            <p>
                                <h4 style={{color: '#fff', fontWeight: '400', marginBottom: '6px'}}>Название</h4>
                                <Input placegolder={'Название'} value={selectedFavoriteObject?.name}
                                       onChange={(e) => setselectedFavoriteObject({...selectedFavoriteObject, name:e.target.value})}/>
                            </p>
                            <p>
                                <h4 style={{color: '#fff', fontWeight: '400', marginBottom: '6px'}}>Валютные пары</h4>
                                <div>
                                    <Select
                                        className='currency_selector'
                                        showSearch
                                        mode="tags"
                                        style={{
                                            width: '100%'
                                        }}
                                        value={selectedFavoriteObject?.list}
                                        dropdownStyle={{
                                            background: 'rgba(7, 7, 7, 0.6)',
                                            border: 'none',
                                            padding: '10px 8px 10px',
                                            textAlign: 'center',
                                        }}
                                        placeholder="Выберите валютные пары"
                                        filterOption={(input, option) =>
                                            option?.label.toLowerCase().includes(input.toLowerCase())
                                        }
                                        filterSort={(optionA, optionB) =>
                                            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                        }
                                        onChange={(value)=>{setselectedFavoriteObject({...selectedFavoriteObject, list:value})}}
                                        options={isCurrency}
                                    />
                                </div>
                            </p>
                                </>
                                :
                                <></>
                            }
                        </>
                        :
                        <>
                            <p>
                                <h4 style={{color: '#fff', fontWeight: '400', marginBottom: '6px'}}>Название</h4>
                                <Input placegolder={'Название'} value={isName}
                                       onChange={(e) => setName(e.target.value)}/>
                            </p>
                            <p>
                                <h4 style={{color: '#fff', fontWeight: '400', marginBottom: '6px'}}>Валютные пары</h4>
                                <div>
                                    <Select
                                        className='currency_selector'
                                        showSearch
                                        mode="tags"
                                        style={{
                                            width: '100%'
                                        }}
                                        value={currencyList}
                                        dropdownStyle={{
                                            background: 'rgba(7, 7, 7, 0.6)',
                                            border: 'none',
                                            padding: '10px 8px 10px',
                                            textAlign: 'center',
                                        }}
                                        placeholder="Выберите валютные пары"
                                        filterOption={(input, option) =>
                                            option?.label.toLowerCase().includes(input.toLowerCase())
                                        }
                                        filterSort={(optionA, optionB) =>
                                            (optionA?.label ?? '').toLowerCase().localeCompare((optionB?.label ?? '').toLowerCase())
                                        }
                                        onChange={handleCurrencyChange}
                                        options={isCurrency}
                                    />
                                </div>
                            </p>
                        </>
                    }
                </Modal>
            </ConfigProvider>
        </>
    );
};

export default FavoriteModal;