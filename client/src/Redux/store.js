
import { createStore } from 'redux';

import rootReducer from './reducers.js';

const store = createStore(rootReducer, window.__REDUX_DEVTOOLS_EXTENSION__());

export default store;
