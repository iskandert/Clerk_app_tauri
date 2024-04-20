import { devUrl } from '../config';
import axios from 'axios';

export default {
    getData({ col, params }) {
        return axios.get(`${devUrl}/api/${col}`, { params }).then(response => response.data);
    },
    putData({ col, id, params, payload }) {
        return axios
            .put(`${devUrl}/api/${col}/${id}`, payload, { params })
            .then(response => response.data);
    },
    deleteData({ col, params }) {
        return axios.delete(`${devUrl}/api/${col}`, params).then(response => response.data);
    },
};
