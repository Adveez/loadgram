/**
 * ws and http services
 */

var http = {
	get : function (path)  {
		var r = new XMLHttpRequest();
		r.open('GET', path, true);
		return new Promise (function (resolve, reject) {
			r.onreadystatechange = function () {
				if (r.readyState === 4) {
					if (r.status != 200) return reject(new Error('HTTP error status code: '+ r.status));
					resolve(JSON.parse(r.responseText));
				}
			};
			r.send();
		});
		
	}
};

var ws = {
	connect : function (path) {
		return new WebSocket('ws://' + window.location.host + path);
	}
}

/**
 * constants
 */

var constants = {
	GET_STATUS_STATS : 'GET_STATUS_STATS',
	GET_STATUS_SINGLE_STATS : 'GET_STATUS_SINGLE_STATS'
};

/**
 * dispatcher
 */

var dispatcher = {
	_handlers : [],
	handleServiceAction : function (payload) {
		this._handlers.forEach(function (handler) {
			handler(payload);
		});
	},
	register : function (handler) {
		this._handlers.push(handler);
	}
};

/**
 * Main store clusterStore
 */

var clusterStore = {
	status : {},
	stats : [],
	_listeners : {},
	addListener : function (name, listener) {
		if (!this._listeners[name]) this._listeners[name] = [];
		this._listeners[name].push(listener);
	},
	removeListener : function (name, listener) {
		if (!this._listeners[name]) this._listeners[name] = [];
		this._listeners[name].splice(this._listeners[name].indexOf(listener), 1);
	},
	getStatus : function () {
		return this.status;
	},
	getStats : function () {
		return this.stats;
	},
	emitChange : function () {
		this._listeners['change'].forEach(function (listener) {
			listener();
		})
	},
	_setStats : function (stats) {
		var frontendName = stats.frontend.name;
		var index = null;
		for(var i = 0; i < this.stats.length; i++) {
			if (this.stats[i].frontend.name === frontendName) {
				index = i;
			}
		}
		if (index !== null) {
			this.stats.splice(index, 1, stats);
		} else {
			this.stats.push(stats);
		}
	},
};

clusterStore.dispatchToken = dispatcher.register(function (payload) {
	switch (payload.action) {
		case constants.GET_STATUS_STATS:
			clusterStore.status = payload.status;
			clusterStore.stats = payload.stats;
			clusterStore.emitChange();
		break;
		case constants.GET_STATUS_SINGLE_STATS:
			clusterStore.status = payload.status;
			clusterStore._setStats(payload.stats);
			clusterStore.emitChange();
		break;
		default :
	}
});

/**
 * Main action creators clusterActions
 */

var clusterActions = {
	bootstrap : function () {
		Promise.all([
			http.get('/api/v1/status'),
			http.get('/api/v1/stats')
		])
		.then(function (responses) {
			dispatcher.handleServiceAction({
				action : constants.GET_STATUS_STATS,
				status : responses[0],
				stats : responses[1]
			});
			var url = '/api/v1/realtime';
			ws.connect(url).onmessage = function (event) {
				var data = JSON.parse(event.data);
				dispatcher.handleServiceAction({
					action : constants.GET_STATUS_SINGLE_STATS,
					status : data.status,
					stats : data.stats
				});
			};
		})
		.catch(function (err) {
			console.error(err);
		});
	}
};


/**
 * Get state from stores
 */

var getStateFromStores = function () {
	var state = {
		status : clusterStore.getStatus(),
		stats : clusterStore.getStats()
	};
	return state;
};

/**
 * Component Header
 */

var Header = React.createClass({
	displayName : 'Header',
	render : function () {
		return <div className="pure-g">
				<div className="pure-u-1">
					<h1> Loadgram - v{this.props.status.version} </h1>
					<h5> process pid {this.props.status.pid} / uid {this.props.status.uid} </h5>
					<h5> uptime: {this.props.status.uptimeDays} days </h5>
					<h5> rss: {this.props.status.rssMo}Mo | heap total: {this.props.status.heapTotalMo}Mo | heap used: {this.props.status.heapUsedMo}Mo </h5>
				</div>
			</div>;
	}
});

/**
 * Component Panel
 */

var Panel = React.createClass({
	displayName : 'Panel',
	renderFrontendTable : function (stat) {
		return <table className="pure-table">
					<thead>
						<tr>
						<th>Inc packets</th>
						<th>Out packets</th>
						<th>Average inc packet size</th>
						<th>Average out packet size</th>
						<th>Errors</th>
						<th>Timeouts</th>
						</tr>
					</thead>

					<tbody>
						{stat.map(function (stat) {
							var upClasses = stat.up 
								? 'success'
								: 'error';
							return <tr className={upClasses}>
								<td>{stat.countIncomingPackets}</td>
								<td>{stat.countOutgoingPackets}</td>
								<td>{stat.averageIncomingPacketSize} octets</td>
								<td>{stat.averageOutgoingPacketSize} octets</td>
								<td>{stat.countErrors}</td>
							</tr>
						})}
					</tbody>
				</table>;
	},
	renderBackendTable : function (stat) {
		return <table className="pure-table">
					<thead>
						<tr>
						<th>#</th>
						<th>Hostname</th>
						<th>Inc packets</th>
						<th>Out packets</th>
						<th>Average inc packet size</th>
						<th>Average out packet size</th>
						<th>Errors</th>
						<th>Timeouts</th>
						<th>Backup</th>
						</tr>
					</thead>

					<tbody>
						{stat.map(function (stat) {
							var upClasses = stat.up 
								? 'success'
								: 'error';
							return <tr className={upClasses}>
								<td>{stat.id}</td>
								<td>{stat.hostname}</td>
								<td>{stat.countIncomingPackets}</td>
								<td>{stat.countOutgoingPackets}</td>
								<td>{stat.averageIncomingPacketSize} octets</td>
								<td>{stat.averageOutgoingPacketSize} octets</td>
								<td>{stat.countErrors}</td>
								<td>{stat.countTimeoutErrors}</td>
								<td>{stat.backup ? 'Yes' : 'No'}</td>
							</tr>
						})}
					</tbody>
				</table>;
	},
	renderTables : function () {
		var self = this;
		return this.props.stats.map(function (stat) {
			return <div className="pure-g">
					<div className="pure-u-1">
						<h2>{stat.frontend.name} </h2>
						{self.renderFrontendTable([stat.frontend])}
						<h3> Statistics backends </h3>
						{self.renderBackendTable(stat.backends)}
					</div>
				</div>;
		});
	},
	render : function () {
		return <div className="pure-g">
				<div className="pure-u-1">
					{this.renderTables()}
				</div>
			</div>;
	}	
});


/**
 * Main component App
 */

var App = React.createClass({
	displayName : 'App',
	getInitialState : function () {
		return getStateFromStores();
	},
	componentWillMount : function () {
		clusterActions.bootstrap();
	},
	componentDidMount : function () {
		clusterStore.addListener('change', this._onChange);
	},
	componentWillUnmount : function () {
		clusterStore.removeListener('change', this._onChange);
	},
	_onChange : function () {
		return this.setState(getStateFromStores());
	},
	render : function () {
		// console.log('Rendering component App', this.state);
		return <div className="pure-g">
					<div className="pure-u-1">
						<Header {...this.state}/>
						<Panel {...this.state}/>
					</div>
				</div>;
	}
});

React.render(<App/>, document.getElementById('app'));