/* eslint-env browser */
import { Component } from 'preact';

import './StatusPageEmbed.scss';

type Position = 'bl' | 'br' | 'tl' | 'tr';
type FontAwesomeVariant = 'fas' | 'far' | 'fal' | 'fad';

interface Status {
  indicator: string;
  description: string;
  url?: string;
}

interface IncidentUpdate {
  id: string;
  status: string;
  body: string;
  created_at: string;
  updated_at: string;
  display_at: string;
}

interface Incident {
  id: string;
  name: string;
  impact: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  monitoring_at?: string | null;
  resolved_at?: string | null;
  shortlink?: string;
  scheduled_for?: string;
  scheduled_until?: string;
  incident_updates: IncidentUpdate[];
  components?: Array<{ id: string; name?: string; status?: string; description?: string | null; group?: boolean }>;
}

interface SummaryResponse {
  page: { url: string; id?: string; name?: string };
  incidents: Incident[];
  scheduled_maintenances: Array<Incident & { started_at: string; status: string }>;
  components?: Array<{ id: string; name?: string; status?: string; description?: string | null; group?: boolean }>;
}

interface StatusPageEmbedProps {
  apiBase?: string;
  components?: string[];
  pollInterval?: number;
  position?: Position;
  testMode?: boolean;
  fontAwesomeVariant?: FontAwesomeVariant;
}

interface StatusPageEmbedState {
  status: Status;
  incidents: Incident[];
  initialised: boolean;
  previousState?: Pick<StatusPageEmbedState, 'status' | 'incidents'>;
}

const abortController = new AbortController();
const initialState: Omit<StatusPageEmbedState, 'previousState'> = {
  status: {
    indicator: 'none',
    description: 'All Systems Operational',
  },
  incidents: [],
  initialised: false,
};

const testModeResponse: SummaryResponse = {
  page: {
    url: 'https://status.example.com',
  },
  incidents: [
    {
      id: 'test-mode-incident',
      name: 'Outage: Test mode incident',
      impact: 'minor',
      shortlink: 'http://status.example.com/test-mode-incident',
      scheduled_for: undefined,
      scheduled_until: undefined,
      incident_updates: [
        {
          id: 'test-mode-incident-update',
          status: 'investigating',
          body: 'This will be shown if an incident or maintenance is posted on your status page.',
          created_at: '2019-12-06T10:12:21.898+00:00',
          updated_at: '2019-12-06T10:12:22.448+00:00',
          display_at: '2019-12-06T10:12:21.898+00:00',
        },
      ],
      components: [{ id: 'test-mode-component' }],
    },
  ],
  scheduled_maintenances: [],
};

// check if we can use localStorage (some users may disable 3rd party cookies)
let localStorageAvailable = true;
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
} catch {
  localStorageAvailable = false;
}

class StatusPageEmbed extends Component<StatusPageEmbedProps, StatusPageEmbedState> {
  static defaultProps = {
    apiBase: 'https://status.warwick.ac.uk/api',
    components: [],
    pollInterval: 60000,
    position: 'bl',
    testMode: false,
    fontAwesomeVariant: 'fas',
  };

  state: StatusPageEmbedState = { ...initialState };
  _isMounted = false;
  pollIntervalId = null;

  componentDidMount() {
    this._isMounted = true;

    // Schedule API polling and call immediately
    const pollInterval = this.props.pollInterval ?? StatusPageEmbed.defaultProps.pollInterval;
    this.pollIntervalId = setInterval(() => this.poll(), pollInterval);
    this.poll();
  }

  async fetchFromServer(): Promise<SummaryResponse> {
    const apiBase = this.props.apiBase ?? StatusPageEmbed.defaultProps.apiBase;
    const testMode = this.props.testMode ?? StatusPageEmbed.defaultProps.testMode;

    if (testMode) {
      return await new Promise((resolve) => setTimeout(() => resolve(testModeResponse), 50));
    }

    try {
      const response = await fetch(`${apiBase}/v2/summary.json`, { signal: abortController.signal });
      return await response.json();
    } catch (e) {
      if (window.console && console.log) {
        console.log('Failed to fetch current system status from statuspage', e);
      }

      return {
        page: {
          // This won't be used to link out anyway
          url: apiBase,
        },
        components: [],
        incidents: [],
        scheduled_maintenances: [],
      };
    }
  }

  async poll() {
    try {
      const data = await this.fetchFromServer();

      // Just return a subset of the data so we don't accidentally rely on something that we haven't set in initialState
      // Filter based on component if necessary
      const dismissedIncidents = localStorageAvailable
        ? JSON.parse(localStorage.getItem(`statuspage_dismissed_${new URL(this.props.apiBase ?? StatusPageEmbed.defaultProps.apiBase).hostname}`) ?? '[]') as string[]
        : [];

      const filterIncidents = (incident: Incident) => {
        if (dismissedIncidents.includes(incident.id)) {
          return false;
        } else if (incident.components && this.props.components && this.props.components.length) {
          return this.props.components.some((componentId) => incident.components!.some((c) => c.id === componentId));
        } else {
          return true;
        }
      };

      const maintenanceToIncident = (maintenance: SummaryResponse['scheduled_maintenances'][number]): Incident => ({
        ...maintenance,
        incident_updates: maintenance.incident_updates,
        created_at: maintenance.started_at,
      });

      let status: Status;
      const incidents = [
        ...data.incidents.filter(filterIncidents),
        ...data.scheduled_maintenances.filter((m) => m.status === 'in_progress').filter(filterIncidents).map(maintenanceToIncident),
      ];

      if (incidents.length) {
        status = {
          indicator: incidents[0].impact,
          description: incidents[0].name,
          url: (incidents.length === 1 && incidents[0].shortlink) || data.page.url,
        };
      } else {
        status = {
          indicator: 'none',
          description: 'All Systems Operational',
        };
      }

      this.update({
        status,
        incidents,
        initialised: true,
      });
    } catch (ex: any) {
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
      localStorage.setItem(`statuspage_dismissed_${new URL(this.props.apiBase ?? StatusPageEmbed.defaultProps.apiBase).hostname}`, JSON.stringify(this.state.incidents.map((i) => i.id)));
    } else {
      this.stopPolling();
    }

    this.update(initialState);
  }

  update(newState: Omit<StatusPageEmbedState, 'previousState'>) {
    if (this._isMounted) {
      this.setState((state) => ({
        ...newState,
        previousState: {
          status: state.status,
          incidents: state.incidents,
        },
      }));
    }
  }

  render() {
    const currentStatus = this.state.status;
    const position = this.props.position ?? StatusPageEmbed.defaultProps.position;
    const fontAwesomeVariant = this.props.fontAwesomeVariant ?? StatusPageEmbed.defaultProps.fontAwesomeVariant;

    // If the current indicator is none, use the previous state for rendering so we don't get a flash
    let status: Status;
    let incidents: Incident[];
    if (currentStatus.indicator === 'none' && this.state.previousState) {
      ({ status, incidents } = this.state.previousState);
    } else {
      ({ status, incidents } = this.state);
    }

    let icon;
    if (status.indicator === 'maintenance') {
      icon = (<i className={`${fontAwesomeVariant} fa-info-circle`} aria-hidden="true" />);
    } else if (status.indicator !== 'none') {
      icon = (<i className={`${fontAwesomeVariant} fa-exclamation-triangle`} aria-hidden="true" />);
    }

    let context: string | undefined;
    if (incidents.length > 2) {
      context = `+ ${incidents.length - 1} others`;
    } else if (incidents.length === 2) {
      context = '+ 1 other';
    } else if (incidents.length) {
      const incident = incidents[0];
      if (incident.scheduled_for && incident.scheduled_until) {
        const fromDate = new Date(incident.scheduled_for);
        const toDate = new Date(incident.scheduled_until);
        const pad = (i: number) => (i < 10 ? `0${i}` : i.toString());
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        context = `${pad(fromDate.getDate())} ${months[fromDate.getMonth()]} ${fromDate.getFullYear()} from ${pad(fromDate.getHours())}:${pad(fromDate.getMinutes())} to ${pad(toDate.getDate())} ${months[toDate.getMonth()]} ${toDate.getFullYear()} ${pad(toDate.getHours())}:${pad(toDate.getMinutes())}`;
      } else if (incident.incident_updates.length) {
        context = incident.incident_updates[0].body;
      }
    }

    const tabIndex = (this.state.initialised && currentStatus.indicator !== 'none') ? 0 : -1;

    return (
      <div className={`StatusPageEmbed StatusPageEmbed--${position} StatusPageEmbed--${currentStatus.indicator} ${status.indicator !== currentStatus.indicator ? `StatusPageEmbed--${status.indicator}` : ''} ${(this.state.initialised && currentStatus.indicator !== 'none') ? ' StatusPageEmbed--visible' : ''}`}>
        <div className="StatusPageEmbed__icon">{icon}</div>
        <div className="StatusPageEmbed__content">
          <h1 className="StatusPageEmbed__content__title">{status.description}</h1>
          <div className="StatusPageEmbed__content__context">{context}</div>
          {status.url && (
            <div className="StatusPageEmbed__content__link">
              <a href={status.url} tabIndex={tabIndex} target="_blank" rel="noopener noreferrer">View latest updates</a>
            </div>
          )}
        </div>
        <div className="StatusPageEmbed__close">
          <button className="StatusPageEmbed__close__button" aria-label="Close" onClick={() => this.dismiss()} tabIndex={tabIndex}>
            <i className={`${fontAwesomeVariant} fa-times`} aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }
}

export default StatusPageEmbed;
