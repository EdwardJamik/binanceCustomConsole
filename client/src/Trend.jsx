import React from 'react';
import {useDispatch, useSelector} from "react-redux";

const shortIcon = [
    <svg viewBox="-5 0 24 24" fill="none" width='20px' height='20px'
         xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <path fillRule="evenodd" clipRule="evenodd"
                  d="M8 3.41421V23C8 23.5523 7.5523 24 7 24C6.4477 24 6 23.5523 6 23V3.41421L1.70711 7.70711C1.31658 8.09763 0.68342 8.09763 0.29289 7.70711C-0.09763 7.31658 -0.09763 6.68342 0.29289 6.29289L6.2929 0.292893C6.6834 -0.0976311 7.3166 -0.0976311 7.7071 0.292893L13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711C13.3166 8.09763 12.6834 8.09763 12.2929 7.70711L8 3.41421z"
                  fill="#0ecb81d9"></path>
    </svg>]


    const longIcon = [
        <svg viewBox="-5 0 24 24" id="meteor-icon-kit__regular-long-arrow-down" fill="none" width='20px' height='20px'
             xmlns="http://www.w3.org/2000/svg">
            <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
            <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
                <path fillRule="evenodd" clipRule="evenodd"
                      d="M8 20.5858L12.2929 16.2929C12.6834 15.9024 13.3166 15.9024 13.7071 16.2929C14.0976 16.6834 14.0976 17.3166 13.7071 17.7071L7.7071 23.7071C7.3166 24.0976 6.6834 24.0976 6.2929 23.7071L0.29289 17.7071C-0.09763 17.3166 -0.09763 16.6834 0.29289 16.2929C0.68342 15.9024 1.31658 15.9024 1.70711 16.2929L6 20.5858V1C6 0.447715 6.4477 0 7 0C7.5523 0 8 0.447715 8 1V20.5858z"
                      fill="#f6465dd9"></path>
        </svg>
    ]

const Trend = () => {

    const position = useSelector(state => state.position);
    const dispatch = useDispatch();

    const changePosition = (currentPosition) => {
        const newPosition = currentPosition === 'Short' ? 'Long' : 'Short';
        dispatch({ type: 'FILTER_POSITION', payload: newPosition });
    };

    return (
        <div className="dashboard_item trend" onClick={() => { changePosition(position) }}>
            <span className='gold'>Position:</span>
            {position === 'Short' && <div className='textGreen'>Short{shortIcon}</div>}
            {position === 'Long' && <div className='textRed'>Long{longIcon}</div>}
            <Hint/>
        </div>
    );
};

export default Trend;