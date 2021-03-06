//@TODO: initially populate graph with logged-in user's 'contributions in last year' data
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import actions from './../actions/ActionCreators';
import d3 from 'd3';
import ghFetch from './../utils/utils';
import { Repos, Search, CompetitorsMiniView, CumulativeChart, DailyChart, SentRequest, Request } from './index';


class DashBoard extends Component {
  constructor(props) {
    super(props);
  }

  componentDidUpdate() {
    if (this.props.auth.authenticated && this.props.userContributions[0] === 0) {
      this.getUserContribs();
    }
  }
  getUserContribs() {
    async function getContribs() {
      var numContribs = await ghFetch.utils.fetchLastYearGHContribs(this.props.user.username);
      this.props.actions.getUserContribs(numContribs);
    }
    getContribs.call(this);
  }
  makeMainChart() {
    if (this.props.competitorsData.length > 0){
      CumulativeChart(this.props.competitorsData);
    }
  }
  makeDailyChart() {
    if (this.props.dailyCompetitorsData.length > 0) {
      DailyChart(this.props.dailyCompetitorsData, 'same chart');
    }
  }
  addDailyChart() {
    if (this.props.dailyCompetitorsData.length > 0) {
      DailyChart(this.props.dailyCompetitorsData, 'additional chart');
    }
  }

  render() {
    const { actions } = this.props;
    if (this.props.auth.authenticated) {
      return (
        <div className="dashboard">
          <div className="main-search">
            <div className="dash-header-text text-centered">
              <h1 className="font-white">Search your Git opponent</h1>
              <h3 className="font-white">Your contributions: {this.props.userContributions}</h3>
            </div>
            <div className="search-container text-centered">
              <div className="block text-centered">
                <Search />
              </div>
            </div>
            <div className="spacer-125px"></div>
            <CompetitorsMiniView />
          </div>
          <div className="data-results-container-clear">
            <h2 className="font-white">Achievement Chart</h2>
            <div className="data-results-container full-width">
              <button onClick={this.makeMainChart.bind(this)} className="button"> Tab 1: Total </button>
              <button onClick={this.makeDailyChart.bind(this)} className="button"> Tab 2: Daily </button>

              <div id="commit-charts">
                <svg width={540} height={300}>
                </svg>

                <div id="optional-extra-chart">
                </div>

              </div>

              <button onClick={this.addDailyChart.bind(this)} className="button"> See daily breakdown </button>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div></div>
      )
    }
  }
}

/*
// CHART //
<button onClick={this.makeMainChart.bind(this)}> Tab 1: Total </button>
<button onClick={this.makeDailyChart.bind(this)}> Tab 2: Daily </button>
<div id="commit-charts">
  <svg width={540} height={300}>
  </svg>
  <div id="optional-extra-chart">
  </div>
</div>
<button onClick={this.addDailyChart.bind(this)}> See daily breakdown </button>
// END CHART //
<div id="commit-charts">
  <svg width={540} height={300}>
  </svg>
</div>
<div><Repos /></div>
*/

const mapStateToProps = state => {
  return state;
}

const mapDispatchToProps = dispatch => {
  return {
    actions: bindActionCreators(actions, dispatch)
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(DashBoard);
