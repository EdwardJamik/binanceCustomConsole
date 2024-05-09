
import axios from 'axios';
import {url} from "../Config.jsx";

export const fetchAuthenticationStatus = async () => {
    try {
        const response = await axios.post(
            `${url}/api/v1/`,
            {},
            {withCredentials: true});
        return response.data.status
    } catch (error) {
        console.error(error)
        return false
    }
}
