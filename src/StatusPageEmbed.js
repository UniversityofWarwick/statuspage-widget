/* eslint-env browser */
import React, {Component} from 'react';
import {string, arrayOf, number, oneOf} from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faInfoCircle, faExclamationTriangle } from '@fortawesome/pro-light-svg-icons';

import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import {fetch as fetchPolyfill} from 'whatwg-fetch';

import './StatusPageEmbed.scss';

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

      this.update({
        status,
        incidents,
        initialised: true,
      });
    } catch (ex) {
      if (ex.name === 'AbortError') {
        // Request aborted. Ignore
        this.update(initialState);
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

    this.update(initialState);
  }

  update(newState) {
    this.setState((state) => ({
      ...newState,
      previousState: {
        status: state.status,
        incidents: state.incidents
      }
    }));
  }

  render() {
    const currentStatus = this.state.status;

    // If the current indicator is none, use the previous state for rendering so we don't get a flash
    let status, incidents;
    if (currentStatus.indicator === 'none' && this.state.previousState) {
      ({ status, incidents } = this.state.previousState);
    } else {
      ({ status, incidents } = this.state);
    }

    let icon;
    if (status.indicator === 'maintenance') {
      icon = (<FontAwesomeIcon icon={faInfoCircle} />);
    } else if (status.indicator !== 'none') {
      icon = (<FontAwesomeIcon icon={faExclamationTriangle} />);
    }

    let context;
    if (incidents.length > 2) {
      context = `+ ${incidents.length - 1} others`
    } else if (incidents.length === 2) {
      context = '+ 1 other'
    } else if (incidents.length) {
      const incident = incidents[0];
      if (incident.scheduled_for && incident.scheduled_until) {
        const fromDate = new Date(incident.scheduled_for);
        const toDate = new Date(incident.scheduled_until);
        const pad = (i) => i < 10 ? `0${i}` : i.toString();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        context = `${pad(fromDate.getDay())} ${months[fromDate.getMonth()]} ${fromDate.getFullYear()} from ${pad(fromDate.getHours())}:${pad(fromDate.getMinutes())} to ${pad(toDate.getDay())} ${months[toDate.getMonth()]} ${toDate.getFullYear()} ${pad(toDate.getHours())}:${pad(toDate.getMinutes())}`;
      }
    }

    return (
      <div className={ `StatusPageEmbed StatusPageEmbed--${this.props.position} StatusPageEmbed--${currentStatus.indicator} ${this.state.initialised && currentStatus.indicator !== 'none' && ' StatusPageEmbed--visible'}` }>
        <div className="StatusPageEmbed__icon">{ icon }</div>
        <div className="StatusPageEmbed__content">
          <h1 className="StatusPageEmbed__content__title">{status.description}</h1>
          <div className="StatusPageEmbed__content__context">{ context }</div>
          { status.url && (
            <div className="StatusPageEmbed__content__link">
              <a href={ status.url } target="_blank" rel="noopener noreferrer">View latest updates</a>
            </div>
          ) }
        </div>
        <div className="StatusPageEmbed__close">
          <button className="StatusPageEmbed__close__button" onClick={() => this.dismiss()}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    );
  }
}

export default StatusPageEmbed;
