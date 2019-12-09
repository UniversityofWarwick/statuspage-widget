/* eslint-env browser */
import React, {Component} from 'react';
import {string, arrayOf, number, oneOf} from 'prop-types'

import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import {fetch as fetchPolyfill} from 'whatwg-fetch';

import './StatusPageEmbed.css';

// use native browser implementation if it supports aborting
const fetch = ('signal' in new Request('')) ? window.fetch : fetchPolyfill;

const abortController = new AbortController();
const initialState = {
  status: {
    indicator: 'none',
    description: 'All Systems Operational'
  },
  incidents: [],
  unresolvedIncidents: [],
  initialised: false,
};

// check if we can use localStorage (some users may disable 3rd party cookies)
let localStorageAvailable = true;
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch (ex) {
  localStorageAvailable = false;
}

class StatusPageEmbed extends Component {
  static propTypes = {
    apiBase: string,
    components: arrayOf(string),
    pollInterval: number,
    position: oneOf(['bl', 'br', 'tl', 'tr']),
  };

  static defaultProps = {
    apiBase: 'https://status.warwick.ac.uk/api',
    components: [], // all
    pollInterval: 60000, // once a minute
    position: 'bl', // bottom left
  };

  state = { ...initialState };

  componentDidMount() {
    // Schedule API polling and call immediately
    this.pollIntervalId = setInterval(() => this.poll(), this.props.pollInterval);
    this.poll();
  }

  async poll() {
    try {
      const response = await fetch(`${this.props.apiBase}/v2/summary.json`, {signal: abortController.signal});
      const data = await response.json();

      // Just return a subset of the data so we don't accidentally rely on something that we haven't set in initialState

      // Filter based on component if necessary
      const dismissedIncidents = localStorageAvailable ? JSON.parse(localStorage.getItem(`statuspage_dismissed_${new URL(this.props.apiBase).hostname}`)) : [];
      const filterIncidents = (incident) => {
        if ((dismissedIncidents || []).includes(incident.id)) {
          return false;
        } else if (incident.components && this.props.components && this.props.components.length) {
          return this.props.components.some((componentId) => incident.components.some((c) => c.id === componentId))
        } else {
          return true;
        }
      };

      const maintenanceToIncident = (maintenance) => (
        {
          ...maintenance,
          created_at: maintenance.started_at,
        }
      );

      let status;
      const incidents = [
        ...data.incidents.filter(filterIncidents),
        ...data.scheduled_maintenances.filter(m => m.status === 'in_progress').filter(filterIncidents).map(maintenanceToIncident)
      ];

      if (incidents.length) {
        // Use the first one?
        // none, minor, major, or critical or maintenance
        status = {
          indicator: incidents[0].impact,
          description: incidents[0].name,
          url: (incidents.length === 1 && incidents[0].shortlink) || data.page.url,
        };
      } else {
        status = {
          indicator: 'none',
          description: 'All Systems Operational'
        };
      }

      this.setState({
        status,
        incidents,
        initialised: true,
      });
    } catch (ex) {
      if (ex.name === 'AbortError') {
        // Request aborted. Ignore
        this.setState(initialState);
        return;
      }

      // Re-throw
      throw ex;
    }
  }

  stopPolling() {
    // Cancel any running fetch
    abortController.abort();
    clearInterval(this.pollIntervalId);
  }

  componentWillUnmount() {
    this.stopPolling();
  }

  dismiss() {
    if (localStorageAvailable) {
      localStorage.setItem(`statuspage_dismissed_${new URL(this.props.apiBase).hostname}`, JSON.stringify(this.state.incidents.map(i => i.id)));
    } else {
      this.stopPolling();
    }

    this.setState(initialState);
  }

  render() {
    let icon;
    if (this.state.status.indicator === 'maintenance') {
      icon = (
        <svg width="18px" height="18px" viewBox="0 0 21 21" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" id="status-embed-svg-info-icon">
          <defs>
            <path d="M2,12 C2,6.47666667 6.47666667,2 12,2 C17.5233333,2 22,6.47666667 22,12 C22,17.5233333 17.5233333,22 12,22 C6.47666667,22 2,17.5233333 2,12 Z M4,12 C4,16.4187638 7.58123617,20 12,20 C16.4187638,20 20,16.4187638 20,12 C20,7.58123617 16.4187638,4 12,4 C7.58123617,4 4,7.58123617 4,12 Z M11,11.0029293 C11,10.4490268 11.4438648,10 12,10 C12.5522847,10 13,10.4378814 13,11.0029293 L13,15.9970707 C13,16.5509732 12.5561352,17 12,17 C11.4477153,17 11,16.5621186 11,15.9970707 L11,11.0029293 Z M12,9 C11.4477153,9 11,8.55228475 11,8 C11,7.44771525 11.4477153,7 12,7 C12.5522847,7 13,7.44771525 13,8 C13,8.55228475 12.5522847,9 12,9 Z" id="path-info"></path>
          </defs>
          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g transform="translate(-702.000000, -945.000000)">
              <g id="global/info" transform="translate(700.500000, 943.500000)">
                <mask id="mask-info" fill="white">
                  <use xlinkHref="#path-info"></use>
                </mask>
                <use id="Combined-Shape" fill="#42526E" fillRule="nonzero" xlinkHref="#path-info"></use>
                <g id="Neutral-/-N000" mask="url(#mask-info)" fill="#FFFFFF" fillRule="evenodd">
                  <polygon points="0 24 24 24 24 0 0 0"></polygon>
                </g>
              </g>
            </g>
          </g>
        </svg>
      );
    } else if (this.state.status.indicator !== 'none') {
      icon = (
        <svg width="18px" height="18px" viewBox="0 0 17 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" id="status-embed-svg-exclamation-icon">
          <defs>
            <path d="M13.4161506,4.41651608 L19.5838494,10.5844619 C20.3671375,11.3677813 20.3659678,12.6346542 19.5838494,13.4167144 L13.4161506,19.5839547 C12.6328625,20.3671845 11.3659678,20.3660149 10.5838494,19.5839547 L4.41615055,13.4167144 C3.63286252,12.6334846 3.6340322,11.3666116 4.41615055,10.5844619 L10.5838494,4.41651608 C11.3671375,3.63319669 12.6340322,3.63436641 13.4161506,4.41651608 Z M12,14 C12.552,14 13,13.552 13,13 L13,8 C13,7.448 12.552,7 12,7 C11.448,7 11,7.448 11,8 L11,13 C11,13.552 11.448,14 12,14 Z M12,17 C12.552,17 13,16.552 13,16 C13,15.448 12.552,15 12,15 C11.448,15 11,15.448 11,16 C11,16.552 11.448,17 12,17 Z" id="path-error"></path>
          </defs>
          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g transform="translate(-706.000000, -763.000000)">
              <g id="global/error" transform="translate(702.500000, 759.500000)">
                <mask id="mask-error" fill="white">
                  <use xlinkHref="#path-error"></use>
                </mask>
                <use id="Combined-Shape" fill="#42526E" fillRule="evenodd" xlinkHref="#path-error"></use>
                <g id="Neutral-/-N000" mask="url(#mask-error)" fill="#FFFFFF" fillRule="evenodd">
                  <polygon points="0 24 24 24 24 0 0 0"></polygon>
                </g>
              </g>
            </g>
          </g>
        </svg>
      );
    }

    const closeIcon = (
      <svg width="11px" height="11px" viewBox="0 0 13 13" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" id="status-embed-svg-close-icon">
        <defs>
          <path d="M10,8.8214887 L14.4107443,4.41074435 C14.7361813,4.08530744 15.2638187,4.08530744 15.5892557,4.41074435 C15.9146926,4.73618126 15.9146926,5.26381874 15.5892557,5.58925565 L11.1785113,10 L15.5892557,14.4107443 C15.9146926,14.7361813 15.9146926,15.2638187 15.5892557,15.5892557 C15.2638187,15.9146926 14.7361813,15.9146926 14.4107443,15.5892557 L10,11.1785113 L5.58925565,15.5892557 C5.26381874,15.9146926 4.73618126,15.9146926 4.41074435,15.5892557 C4.08530744,15.2638187 4.08530744,14.7361813 4.41074435,14.4107443 L8.8214887,10 L4.41074435,5.58925565 C4.08530744,5.26381874 4.08530744,4.73618126 4.41074435,4.41074435 C4.73618126,4.08530744 5.26381874,4.08530744 5.58925565,4.41074435 L10,8.8214887 Z" id="path-x"></path>
        </defs>
        <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
          <g transform="translate(-1027.000000, -941.000000)">
            <g id="global/cross" transform="translate(1023.500000, 937.500000)">
              <mask id="mask-x" fill="white">
                <use xlinkHref="#path-x"></use>
              </mask>
              <use id="Combined-Shape" fill="#42526E" fillRule="nonzero" xlinkHref="#path-x"></use>
              <g id="Dark-neutral-/-DN070" mask="url(#mask-x)" fill="#FFFFFF" fillRule="evenodd">
                <polygon id="DN70" points="0 20 20 20 20 0 0 0"></polygon>
              </g>
            </g>
          </g>
        </g>
      </svg>
    );

    let context;
    if (this.state.incidents.length > 2) {
      context = `+ ${this.state.incidents.length - 1} others`
    } else if (this.state.incidents.length === 2) {
      context = '+ 1 other'
    } else if (this.state.incidents.length) {
      const incident = this.state.incidents[0];
      if (incident.scheduled_for && incident.scheduled_until) {
        const fromDate = new Date(incident.scheduled_for);
        const toDate = new Date(incident.scheduled_until);
        const pad = (i) => i < 10 ? `0${i}` : i.toString();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        context = `${pad(fromDate.getDay())} ${months[fromDate.getMonth()]} ${fromDate.getFullYear()} from ${pad(fromDate.getHours())}:${pad(fromDate.getMinutes())} to ${pad(toDate.getDay())} ${months[toDate.getMonth()]} ${toDate.getFullYear()} ${pad(toDate.getHours())}:${pad(toDate.getMinutes())}`;
      }
    }

    return (
      <div className={ `statuspage-embed statuspage-embed--${this.props.position} statuspage-embed--${this.state.status.indicator} ${this.state.initialised && this.state.status.indicator !== 'none' && ' statuspage-embed--visible'}` }>
        <div className="statuspage-embed__icon">{ icon }</div>
        <div className="statuspage-embed__content">
          <h1 className="statuspage-embed__content__title">{this.state.status.description}</h1>
          <div className="statuspage-embed__content__context">{ context }</div>
          { this.state.status.url && (
            <div className="statuspage-embed__content__link">
              <a href={ this.state.status.url } target="_blank" rel="noopener noreferrer">View latest updates</a>
            </div>
          ) }
        </div>
        <div className="statuspage-embed__close">
          <button className="statuspage-embed__close__button" onClick={(e) => this.dismiss()}>
            { closeIcon }
          </button>
        </div>
      </div>
    );
  }
}

export default StatusPageEmbed;
