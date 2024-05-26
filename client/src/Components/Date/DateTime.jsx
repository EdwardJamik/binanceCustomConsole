import React, {useEffect, useState} from 'react';
import dayjs from "dayjs";

import "../datetime.css"
import {useSelector} from "react-redux";
import {ConfigProvider, Select} from "antd";

const morningIcon = [
    <svg fill="#F0D85A" width='26px' key='1' height='26px' viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
    <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <path
            d="M23,16a1,1,0,0,1-1,1H2a1,1,0,0,1,0-2H22A1,1,0,0,1,23,16Zm-5,3H6a1,1,0,0,0,0,2H18a1,1,0,0,0,0-2ZM3,12a1,1,0,0,0,2,0,7,7,0,0,1,14,0,1,1,0,0,0,2,0A9,9,0,0,0,3,12Z"></path>
</svg>
]

const nightIcon = [
    <svg viewBox="0 0 24 24" width='26px' key='2' height='26px' fill="none" xmlns="http://www.w3.org/2000/svg">
        <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
            <path
                d="M14.5739 1.11056L13.7826 2.69316C13.7632 2.73186 13.7319 2.76325 13.6932 2.7826L12.1106 3.5739C11.9631 3.64761 11.9631 3.85797 12.1106 3.93167L13.6932 4.72297C13.7319 4.74233 13.7632 4.77371 13.7826 4.81241L14.5739 6.39502C14.6476 6.54243 14.858 6.54243 14.9317 6.39502L15.723 4.81241C15.7423 4.77371 15.7737 4.74232 15.8124 4.72297L17.395 3.93167C17.5424 3.85797 17.5424 3.64761 17.395 3.5739L15.8124 2.7826C15.7737 2.76325 15.7423 2.73186 15.723 2.69316L14.9317 1.11056C14.858 0.963147 14.6476 0.963148 14.5739 1.11056Z"
                fill="#F0D85A"></path>
            <path
                d="M19.2419 5.07223L18.4633 7.40815C18.4434 7.46787 18.3965 7.51474 18.3368 7.53464L16.0009 8.31328C15.8185 8.37406 15.8185 8.63198 16.0009 8.69276L18.3368 9.4714C18.3965 9.4913 18.4434 9.53817 18.4633 9.59789L19.2419 11.9338C19.3027 12.1161 19.5606 12.1161 19.6214 11.9338L20.4 9.59789C20.42 9.53817 20.4668 9.4913 20.5265 9.4714L22.8625 8.69276C23.0448 8.63198 23.0448 8.37406 22.8625 8.31328L20.5265 7.53464C20.4668 7.51474 20.42 7.46787 20.4 7.40815L19.6214 5.07223C19.5606 4.88989 19.3027 4.88989 19.2419 5.07223Z"
                fill="#F0D85A"></path>
            <path fillRule="evenodd" clipRule="evenodd"
                  d="M10.4075 13.6642C13.2348 16.4915 17.6517 16.7363 20.6641 14.3703C20.7014 14.341 20.7385 14.3113 20.7754 14.2812C20.9148 14.1674 21.051 14.0479 21.1837 13.9226C21.2376 13.8718 21.2909 13.8201 21.3436 13.7674C21.8557 13.2552 22.9064 13.5578 22.7517 14.2653C22.6983 14.5098 22.6365 14.7517 22.5667 14.9905C22.5253 15.1321 22.4811 15.2727 22.4341 15.4122C22.4213 15.4502 22.4082 15.4883 22.395 15.5262C20.8977 19.8142 16.7886 23.0003 12 23.0003C5.92487 23.0003 1 18.0754 1 12.0003C1 7.13315 4.29086 2.98258 8.66889 1.54252L8.72248 1.52504C8.8185 1.49401 8.91503 1.46428 9.01205 1.43587C9.26959 1.36046 9.5306 1.29438 9.79466 1.23801C10.5379 1.07934 10.8418 2.19074 10.3043 2.72815C10.251 2.78147 10.1987 2.83539 10.1473 2.88989C10.0456 2.99777 9.94766 3.10794 9.8535 3.22023C9.83286 3.24485 9.8124 3.26957 9.79212 3.29439C7.32966 6.30844 7.54457 10.8012 10.4075 13.6642ZM8.99331 15.0784C11.7248 17.8099 15.6724 18.6299 19.0872 17.4693C17.4281 19.6024 14.85 21.0003 12 21.0003C7.02944 21.0003 3 16.9709 3 12.0003C3 9.09163 4.45653 6.47161 6.66058 4.81846C5.41569 8.27071 6.2174 12.3025 8.99331 15.0784Z"
                  fill="#F0D85A"></path>
    </svg>
]

const dayIcon = [
    <svg fill="#F0D85A" width='26px' key='3' height='26px' version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg"
         viewBox="0 0 475.465 475.465"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
        <g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g>
        <g id="SVGRepo_iconCarrier"> <g> <g> <path
            d="M320.535,320.229c10.701-10.701,19.107-23.173,24.986-37.071c6.095-14.411,9.186-29.694,9.186-45.426 c0-15.732-3.091-31.015-9.186-45.426c-5.879-13.898-14.285-26.371-24.986-37.071c-10.7-10.701-23.173-19.107-37.071-24.986 c-14.411-6.095-29.694-9.186-45.426-9.186c-15.73,0-31.014,3.091-45.425,9.186c-13.898,5.878-26.371,14.285-37.071,24.986 c-10.701,10.701-19.107,23.173-24.985,37.071c-6.096,14.411-9.186,29.695-9.186,45.426c0,15.731,3.09,31.015,9.186,45.426 c5.878,13.898,14.285,26.37,24.985,37.071s23.173,19.107,37.071,24.985c14.412,6.096,29.695,9.187,45.425,9.187 c15.732,0,31.015-3.091,45.426-9.187C297.362,339.337,309.835,330.931,320.535,320.229z M238.038,163.903 c40.776,0,73.83,33.054,73.83,73.829c0,40.774-33.054,73.829-73.83,73.829c-40.774,0-73.828-33.055-73.828-73.829 C164.209,196.958,197.264,163.903,238.038,163.903z"></path>
            <path
                d="M238.038,354.901c-15.797,0-31.146-3.104-45.62-9.226c-13.958-5.903-26.484-14.346-37.23-25.093 c-10.747-10.747-19.189-23.273-25.092-37.23c-6.122-14.472-9.226-29.821-9.226-45.62c0-15.799,3.104-31.148,9.226-45.621 c5.904-13.958,14.346-26.484,25.092-37.23c10.746-10.747,23.272-19.189,37.23-25.093c14.474-6.122,29.823-9.226,45.62-9.226 c15.798,0,31.148,3.104,45.621,9.226c13.959,5.904,26.485,14.346,37.23,25.093c10.746,10.746,19.188,23.271,25.094,37.23 c6.121,14.474,9.225,29.822,9.225,45.621c0,15.798-3.104,31.146-9.225,45.62c-5.904,13.958-14.347,26.483-25.094,37.23 c-10.746,10.747-23.271,19.189-37.23,25.093C269.186,351.797,253.836,354.901,238.038,354.901z M238.038,121.563 c-15.663,0-30.88,3.077-45.23,9.146c-13.839,5.854-26.258,14.224-36.913,24.879s-19.025,23.074-24.878,36.913 c-6.069,14.349-9.146,29.566-9.146,45.231c0,15.665,3.077,30.883,9.146,45.231c5.853,13.837,14.223,26.256,24.878,36.912 c10.655,10.655,23.074,19.025,36.913,24.878c14.35,6.07,29.567,9.147,45.23,9.147c15.665,0,30.882-3.077,45.232-9.147 c13.839-5.853,26.258-14.223,36.912-24.878c10.655-10.655,19.026-23.074,24.879-36.912c6.069-14.351,9.146-29.568,9.146-45.231 c0-15.664-3.077-30.881-9.146-45.231c-5.854-13.839-14.225-26.258-24.879-36.913c-10.654-10.655-23.073-19.025-36.912-24.879 C268.92,124.641,253.701,121.563,238.038,121.563z M238.038,312.062c-40.985,0-74.328-33.344-74.328-74.329 s33.343-74.329,74.328-74.329c40.986,0,74.33,33.344,74.33,74.329S279.023,312.062,238.038,312.062z M238.038,164.403 c-40.433,0-73.328,32.896-73.328,73.329s32.895,73.329,73.328,73.329c40.434,0,73.33-32.896,73.33-73.329 S278.472,164.403,238.038,164.403z"></path> </g>
            <g> <path
                d="M238.705,377.589c-11.798,0-21.381,9.546-21.419,21.354l-0.17,54.535c-0.038,11.83,9.523,21.449,21.353,21.486 c0.023,0,0.045,0,0.068,0c11.799,0,21.382-9.546,21.419-21.354l0.171-54.535c0.037-11.83-9.523-21.45-21.354-21.486 C238.75,377.589,238.727,377.589,238.705,377.589z"></path>
                <path
                    d="M238.537,475.464h-0.068c-5.857-0.019-11.354-2.315-15.481-6.469c-4.127-4.152-6.39-9.664-6.372-15.52l0.17-54.535 c0.039-12.049,9.871-21.852,21.919-21.852c5.925,0.018,11.423,2.314,15.55,6.468c4.128,4.153,6.391,9.665,6.372,15.521 l-0.171,54.535C260.418,465.661,250.585,475.464,238.537,475.464z M238.771,378.089c-11.565,0-20.949,9.355-20.986,20.855 l-0.17,54.535c-0.018,5.588,2.142,10.848,6.081,14.812c3.939,3.963,9.186,6.155,14.774,6.173l0.067,0.5v-0.5 c11.499,0,20.883-9.355,20.919-20.855l0.171-54.535c0.018-5.588-2.143-10.848-6.081-14.812 C249.606,380.298,244.359,378.105,238.771,378.089z"></path> </g>
            <g> <path
                d="M237.366,97.876c0.058,0,0.118,0,0.177,0c11.83-0.096,21.341-9.763,21.247-21.593l-0.441-54.535 c-0.096-11.83-9.75-21.33-21.593-21.246c-11.83,0.096-21.342,9.763-21.246,21.592l0.441,54.536 C216.046,88.401,225.616,97.876,237.366,97.876z"></path>
                <path
                    d="M237.366,98.376c-11.987,0-21.818-9.753-21.916-21.743l-0.441-54.536c-0.047-5.854,2.188-11.377,6.294-15.551 s9.593-6.498,15.448-6.545l0.16,0c11.999,0,21.841,9.753,21.938,21.743l0.441,54.535c0.097,12.086-9.657,21.999-21.743,22.097 L237.366,98.376z M236.911,1.001l-0.152,0c-5.587,0.045-10.823,2.264-14.742,6.247c-3.919,3.983-6.053,9.254-6.007,14.842 l0.441,54.536c0.093,11.442,9.476,20.75,20.916,20.75l0.173,0c11.534-0.094,20.843-9.554,20.75-21.089l-0.441-54.535 C257.756,10.31,248.363,1.001,236.911,1.001z"></path> </g>
            <g> <path
                d="M21.919,217.116c-11.798,0-21.381,9.546-21.419,21.353c-0.037,11.831,9.523,21.45,21.354,21.487l54.535,0.171 c0.023,0,0.045,0,0.068,0c11.798,0,21.382-9.547,21.419-21.354c0.038-11.83-9.523-21.45-21.353-21.487l-54.536-0.171 C21.964,217.116,21.942,217.116,21.919,217.116z"></path>
                <path
                    d="M76.457,260.627h-0.068l-54.537-0.171C9.765,260.418-0.038,250.554,0,238.467c0.039-12.048,9.871-21.851,21.919-21.851 l54.605,0.171c5.855,0.018,11.353,2.315,15.48,6.468c4.127,4.153,6.39,9.665,6.372,15.521 C98.338,250.824,88.505,260.627,76.457,260.627z M21.986,217.616c-11.565,0-20.949,9.355-20.986,20.855 c-0.036,11.535,9.319,20.949,20.855,20.985l54.535,0.171l0.067,0.5v-0.5c11.499,0,20.883-9.355,20.919-20.855 c0.018-5.587-2.142-10.848-6.081-14.812c-3.939-3.964-9.186-6.156-14.773-6.173L21.986,217.616z"></path> </g>
            <g> <path
                d="M474.964,236.755c-0.096-11.771-9.666-21.247-21.416-21.247c-0.059,0-0.118,0-0.177,0.001l-54.535,0.441 c-11.83,0.095-21.342,9.763-21.247,21.592c0.096,11.771,9.666,21.247,21.416,21.247c0.059,0,0.118,0,0.177,0l54.535-0.441 C465.547,258.253,475.059,248.586,474.964,236.755z"></path>
                <path
                    d="M399.184,259.29h-0.179c-11.987,0-21.818-9.754-21.916-21.743c-0.097-12.086,9.657-21.999,21.743-22.096l54.716-0.442 c11.987,0,21.818,9.754,21.916,21.743c0.097,12.086-9.657,22-21.743,22.097L399.184,259.29z M453.548,216.008l-0.169,0.001 l-54.539,0.441c-11.534,0.093-20.844,9.553-20.751,21.088c0.093,11.442,9.476,20.751,20.916,20.751h0.175l54.533-0.441 c11.534-0.094,20.844-9.554,20.751-21.089C474.371,225.317,464.988,216.008,453.548,216.008z"></path> </g>
            <g> <path
                d="M85.698,412.322c5.459,0,10.92-2.074,15.098-6.227l38.684-38.441c8.391-8.339,8.434-21.901,0.095-30.292 c-8.338-8.393-21.901-8.435-30.292-0.096l-38.684,38.442c-8.391,8.338-8.434,21.9-0.095,30.292 C74.691,410.214,80.194,412.322,85.698,412.322z"></path>
                <path
                    d="M85.698,412.822c-5.881,0-11.403-2.297-15.548-6.469c-4.127-4.153-6.391-9.665-6.372-15.521 c0.019-5.854,2.316-11.352,6.469-15.479l38.684-38.442c4.135-4.109,9.622-6.372,15.451-6.372c5.881,0,11.403,2.298,15.548,6.47 c4.127,4.153,6.39,9.664,6.372,15.52c-0.019,5.855-2.316,11.353-6.469,15.479l-38.684,38.441 C97.014,410.56,91.527,412.822,85.698,412.822z M124.381,331.54c-5.563,0-10.8,2.16-14.746,6.081l-38.684,38.442 c-3.964,3.938-6.156,9.186-6.174,14.772c-0.018,5.589,2.142,10.849,6.081,14.812c3.957,3.981,9.227,6.174,14.839,6.174 c5.563,0,10.8-2.16,14.746-6.081l38.684-38.441c3.964-3.939,6.156-9.186,6.174-14.773c0.017-5.588-2.142-10.849-6.081-14.812 C135.264,333.733,129.994,331.54,124.381,331.54z"></path> </g>
            <g> <path
                d="M366.784,138.46l38.25-38.875c8.297-8.433,8.188-21.994-0.244-30.292c-8.434-8.297-21.994-8.187-30.292,0.245 l-38.251,38.875c-8.297,8.433-8.187,21.994,0.245,30.292c4.172,4.105,9.598,6.152,15.022,6.152 C357.054,144.857,362.592,142.72,366.784,138.46z"></path>
                <path
                    d="M351.515,145.357c-5.788,0-11.247-2.236-15.373-6.295c-8.615-8.478-8.728-22.383-0.251-30.999l38.251-38.875 c4.154-4.221,9.703-6.546,15.626-6.546c5.787,0,11.247,2.236,15.373,6.295c8.614,8.478,8.727,22.383,0.25,30.999l-38.25,38.875 C362.986,143.032,357.437,145.357,351.515,145.357z M389.768,63.642c-5.652,0-10.948,2.219-14.913,6.247l-38.251,38.875 c-8.09,8.222-7.982,21.494,0.239,29.584c3.938,3.875,9.148,6.008,14.672,6.008c5.652,0,10.948-2.219,14.913-6.247l38.25-38.875 c8.09-8.223,7.983-21.494-0.238-29.584C400.501,65.776,395.291,63.642,389.768,63.642z"></path> </g>
            <g> <path
                d="M123.004,145.802c5.459,0,10.92-2.074,15.098-6.227c8.391-8.338,8.434-21.901,0.095-30.292L99.755,70.6 c-8.338-8.392-21.901-8.434-30.292-0.095c-8.391,8.338-8.434,21.901-0.095,30.292l38.441,38.683 C111.997,143.693,117.5,145.802,123.004,145.802z"></path>
                <path
                    d="M123.004,146.302c-5.881,0-11.403-2.297-15.548-6.469L69.014,101.15c-4.127-4.153-6.391-9.665-6.372-15.521 c0.019-5.855,2.316-11.352,6.469-15.479c4.135-4.109,9.622-6.372,15.451-6.372c5.881,0,11.403,2.297,15.548,6.469l38.441,38.684 c4.127,4.153,6.391,9.665,6.372,15.52c-0.019,5.855-2.316,11.352-6.469,15.479C134.32,144.039,128.833,146.302,123.004,146.302z M84.562,64.778c-5.563,0-10.8,2.16-14.746,6.081c-3.964,3.939-6.156,9.186-6.174,14.773s2.142,10.848,6.081,14.812l38.441,38.683 c3.957,3.981,9.227,6.174,14.839,6.174c5.563,0,10.8-2.16,14.746-6.081c3.964-3.939,6.156-9.186,6.174-14.773 s-2.142-10.848-6.081-14.812L99.401,70.952C95.445,66.971,90.175,64.778,84.562,64.778z"></path> </g>
            <g> <path
                d="M375.879,405.034c4.172,4.105,9.598,6.152,15.022,6.152c5.539,0,11.077-2.137,15.269-6.396 c8.297-8.434,8.188-21.994-0.244-30.292l-38.875-38.25c-8.433-8.298-21.993-8.187-30.291,0.245 c-8.297,8.433-8.188,21.994,0.245,30.291L375.879,405.034z"></path>
                <path
                    d="M390.901,411.687c-5.788,0-11.247-2.236-15.373-6.296l-38.874-38.25c-8.615-8.477-8.728-22.383-0.251-30.998 c4.154-4.222,9.704-6.546,15.627-6.546c5.786,0,11.246,2.235,15.371,6.295l38.875,38.25c8.614,8.478,8.726,22.384,0.25,30.999 C402.373,409.362,396.824,411.687,390.901,411.687z M352.03,330.597c-5.652,0-10.949,2.219-14.914,6.247 c-8.091,8.223-7.983,21.494,0.239,29.584l38.874,38.25c3.938,3.875,9.148,6.009,14.672,6.009c5.652,0,10.948-2.219,14.912-6.247 c8.09-8.223,7.982-21.494-0.238-29.585l-38.875-38.25C362.763,332.73,357.553,330.597,352.03,330.597z"></path> </g> </g> </g></svg>
]

const wallet = [
    <svg width='26px' key='4' height='26px' viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">

            <path d="M6 8H10" stroke="#F0D85A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
            <path
                d="M22 10.5C22 10.4226 22 9.96726 21.9977 9.9346C21.9623 9.43384 21.5328 9.03496 20.9935 9.00214C20.9583 9 20.9167 9 20.8333 9H18.2308C16.4465 9 15 10.3431 15 12C15 13.6569 16.4465 15 18.2308 15H20.8333C20.9167 15 20.9583 15 20.9935 14.9979C21.5328 14.965 21.9623 14.5662 21.9977 14.0654C22 14.0327 22 13.5774 22 13.5"
                stroke="#1C274C" strokeWidth="1.5" strokeLinecap="round"></path>
            <circle cx="18" cy="12" r="1" fill="#F0D85A"></circle>
            <path
                d="M13 4C16.7712 4 18.6569 4 19.8284 5.17157C20.6366 5.97975 20.8873 7.1277 20.965 9M10 20H13C16.7712 20 18.6569 20 19.8284 18.8284C20.6366 18.0203 20.8873 16.8723 20.965 15M9 4.00093C5.8857 4.01004 4.23467 4.10848 3.17157 5.17157C2 6.34315 2 8.22876 2 12C2 15.7712 2 17.6569 3.17157 18.8284C3.82475 19.4816 4.69989 19.7706 6 19.8985"
                stroke="#F0D85A" strokeWidth="1.5" strokeLinecap="round"></path>
    </svg>
]

const DateTime = () => {

    const [currentTime, setCurrentTime] = useState(dayjs());
    const balance = useSelector(state => state.balance)

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(dayjs());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className='dateMonitor'>
            <div className="date">
                <span className='title gold'>{currentTime.format('ddd')}</span>
                {currentTime.format('DD.MM.YYYY')}
            </div>
            <div className="time">
                <span className='title gold'>
                    {currentTime.hour() >= 18 && currentTime.hour() > 0 && <>{morningIcon}</>}
                    {currentTime.hour() >= 12 && currentTime.hour() < 18 && <>{dayIcon}</>}
                    {currentTime.hour() >= 5 && currentTime.hour() < 12 && <>{morningIcon}</>}
                    {currentTime.hour() >= 0 && currentTime.hour() < 5 && <>{nightIcon}</>}
                </span>
                {currentTime.format('HH:mm:ss')}
            </div>
            <div className="time">
                {wallet}
                {balance.length > 1 ?
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

                                colorPrimaryBg: 'rgba(240, 216, 90, 0.4)',
                                fontWeight: '600',
                                colorFillTertiary: 'rgba(240, 216, 90, 0.4)',
                                colorTextTertiary: '#000',
                                colorTextQuaternary: 'rgba(240, 216, 90, 0.4)',
                            },
                        }}
                    >
                        <Select
                            defaultValue="USDT"
                            style={{
                                width: 120,
                            }}
                            dropdownStyle={{
                                background: 'rgba(7, 7, 7, 0.6)',
                                border: 'none',
                                padding: '10px 8px 10px',
                                textAlign: 'center',
                                width: '160px',
                            }}
                            // onChange={handleChange}
                            options={balance}
                        />
                    </ConfigProvider>
                    :
                    <div style={{width:'100%',fontSize:'16px'}}>{balance[0]?.label}</div>

                }

            </div>
        </div>
    );
};

export default DateTime;