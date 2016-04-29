import 'babel-polyfill';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { syncHistoryWithStore } from 'react-router-redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { App, DashBoard } from './containers/index';
import configureStore from './store/store';

const initialState = {
  score: 0,
  tokens: [],
};

const store = configureStore(initialState);

const history = syncHistoryWithStore(browserHistory, store);

render(
  <Provider store={store}>
    <Router history={history}>
      <Route path='/' component={App}>
        <Route path="v1/users" component={DashBoard} />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('root')
);
