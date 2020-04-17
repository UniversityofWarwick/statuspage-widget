/* eslint-env browser */
import React, { Component } from 'react';
import { string, arrayOf, number, oneOf, bool } from 'prop-types';
import { config as FontAwesomeConfig } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faInfoCircle, faExclamationTriangle } from '@fortawesome/pro-light-svg-icons';

import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import {fetch as fetchPolyfill} from 'whatwg-fetch';

import './StatusPageEmbed.scss';

FontAwesomeConfig.autoAddCss = false;
FontAwesomeConfig.autoA11y = true;

// use native browser implementation if it supports aborting
const fetch = ('signal' in new Request('')) ? window.fetch : fetchPolyfill;

const abortController = new AbortController();
const initialState = {
  status: {
    indicator: 'none',
    description: 'All Systems Operational'
  },
  incidents: [],
  initialised: false,
};

const testModeResponse = {
  page: {
    id: 'test-mode-page',
    name: 'Test mode',
    url: 'https://status.example.com'
  },
  components: [
    {
      id: 'test-mode-component',
      name: 'Test mode component',
      status: 'major_outage',
      description: null,
      group: false
    }
  ],
  incidents: [
    {
      id: 'test-mode-incident',
      name: 'Outage: Test mode incident',
      status: 'investigating',
      created_at: '2019-12-06T10:32:54.869+00:00',
      updated_at: '2019-12-09T10:52:38.862+00:00',
      monitoring_at: null,
      resolved_at: null,
      impact: 'minor',
      shortlink: 'http://status.example.com/test-mode-incident',
      incident_updates: [
        {
          id: 'test-mode-incident-update',
          status: 'investigating',
          body: 'This will be shown if an incident or maintenance is posted on your status page.',
          created_at: '2019-12-06T10:12:21.898+00:00',
          updated_at: '2019-12-06T10:12:22.448+00:00',
          display_at: '2019-12-06T10:12:21.898+00:00'
        }
      ],
      components: [
        {
          id: 'test-mode-component',
          name: 'Test mode component',
          status: 'major_outage',
          description: null,
          group: false
        }
      ]
    }
  ],
  scheduled_maintenances: [],
  status: {
    indicator: 'minor',
    description: 'Partially Degraded Service'
  }
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
    testMode: bool,
  };

  static defaultProps = {
    apiBase: 'https://status.warwick.ac.uk/api',
    components: [], // all
    pollInterval: 60000, // once a minute
    position: 'bl', // bottom left
    testMode: false,
  };

  state = { ...initialState };
  _isMounted = false;

  componentDidMount() {
    this._isMounted = true;

    // Schedule API polling and call immediately
    this.pollIntervalId = setInterval(() => this.poll(), this.props.pollInterval);
    this.poll();
  }

  async fetchFromServer() {
    if (this.props.testMode) {
      return await new Promise(resolve => setTimeout(() => resolve(testModeResponse), 50));
    } else {
      try {
        const response = await fetch(`${this.props.apiBase}/v2/summary.json`, {signal: abortController.signal});
        return await response.json();
      } catch (e) {
        if (window.console && console.log) {
          console.log('Failed to fetch current system status from statuspage', e);
        }

        return {
          page: {
            // This won't be used to link out anyway
            url: this.props.apiBase
          },
          components: [],
          incidents: [],
          scheduled_maintenances: [],
          status: {
            indicator: 'none',
            description: 'All Systems Operational'
          }
        };
      }
    }
  }

  async poll() {
    try {
      const data = await this.fetchFromServer();

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
    this._isMounted = false;

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
    if (this._isMounted) {
      this.setState((state) => ({
        ...newState,
        previousState: {
          status: state.status,
          incidents: state.incidents
        }
      }));
    }
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
      } else if (incident.incident_updates.length) {
        context = incident.incident_updates[0].body;
      }
    }

    return (
      <div className={ `StatusPageEmbed StatusPageEmbed--${this.props.position} StatusPageEmbed--${currentStatus.indicator} ${status.indicator !== currentStatus.indicator ? `StatusPageEmbed--${status.indicator}` : ''} ${this.state.initialised && currentStatus.indicator !== 'none' && ' StatusPageEmbed--visible'}` }>
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
          <button className="StatusPageEmbed__close__button" aria-label="Close" onClick={() => this.dismiss()}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
      </div>
    );
  }
}

export default StatusPageEmbed;
