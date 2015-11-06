'use strict';
/**
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var version = require('./../package.json').version;

/**
 * Expose `Reporter` class
 */

module.exports = Reporter;

/**
 * `Reporter` class
 * @inherits EventEmitter
 *
 * @param {Object} options -
 *
 * @constructor
 */

function Reporter(lb) {
	EventEmitter.call(this);
	this.lb = lb;
	this.metrics = {
		frontend : {
			name : 'frontend_:' + lb.port,
			countIncomingPackets : 0,
			countOutgoingPackets : 0,
			averageIncomingPacketSize : 0,
			averageOutgoingPacketSize : 0,
			countErrors : 0,
			up : true,
			lastTimeUp : new Date(),
			healthcheckEnabled : lb.healthcheck.enabled
		},
		backends : lb.backends.reduce(this._initBackendMetrics, {})
	};
	this.watch();
};

util.inherits(Reporter, EventEmitter);

/**
 *
 */

Reporter.prototype.getClusterStats = function () {
	var self = this;
	var stats = {};
	stats.frontend = this.metrics.frontend;
	stats.backends = Object.keys(this.metrics.backends).map(function (key) {
		return self.metrics.backends[key];
	});
	return stats;
};

/**
 *
 */

Reporter.prototype.getClusterStatus = function () {
	var memoryUsage = process.memoryUsage();
	var data = {
		version : version,
		pid : process.pid,
		uid : process.getuid(),
		uptime : process.uptime(),
		uptimeDays : parseFloat((process.uptime() / (3600 * 24)).toFixed(2)), // uptime in days
		rss : memoryUsage.rss,
		heapTotal : memoryUsage.heapTotal,
		heapUsed : memoryUsage.heapUsed,
		rssKo : parseFloat((memoryUsage.rss / 1000).toFixed(2)),
		heapTotalKo : parseFloat((memoryUsage.heapTotal / 1000).toFixed(2)),
		heapUsedKo : parseFloat((memoryUsage.heapUsed / 1000).toFixed(2)),
		rssMo : parseFloat((memoryUsage.rss / 1000000).toFixed(2)),
		heapTotalMo : parseFloat((memoryUsage.heapTotal / 1000000).toFixed(2)),
		heapUsedMo : parseFloat((memoryUsage.heapUsed / 1000000).toFixed(2))
	};
	return data;
}

/**
 *
 */

Reporter.prototype._initBackendMetrics = function (backends, backend) {
	var metrics = {
		id : backend.id,
		hostname : backend.host + ':' + backend.port,
		name : 'backend_' + backend.host + ':' + backend.port,
		countIncomingPackets : 0,
		countOutgoingPackets : 0,
		averageIncomingPacketSize : 0,
		averageOutgoingPacketSize : 0,
		countErrors : 0,
		countTimeoutErrors : 0,
		up : true,
		lastTimeUp : new Date(),
		lastTimeDown : null // a Date
	};
	backends[backend.id] = metrics;
	return backends;
};

/**
 *
 */

Reporter.prototype.watch = function () {
	this.lb.on('error', this._watchError.bind(this));
	this.lb.on('message-received', this._watchMessageReceived.bind(this));
	this.lb.on('message-proxied', this._watchMessageProxied.bind(this));
	this.lb.on('backend::error', this._watchBackendError.bind(this));
	this.lb.on('backend::timeout-reached-error', this._watchTimeoutReachedError.bind(this));
	this.lb.on('backend::message-forwarded', this._watchBackendMessageForwarded.bind(this));
	this.lb.on('backend::healthy', this._watchBackendHealthy.bind(this));
	this.lb.on('backend::unhealthy', this._watchBackendUnhealthy.bind(this));
};

/**
 *
 */

Reporter.prototype._watchError = function (err) {
	this.metrics.frontend.countErrors++;
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchMessageReceived = function (backend, message) {
	var frontend = this.metrics.frontend;
	frontend.countIncomingPackets++;
	frontend.averageIncomingPacketSize = (
		(message.length + (frontend.countIncomingPackets - 1) * frontend.averageIncomingPacketSize)
		/
		frontend.countIncomingPackets
	)
	var target = this.metrics.backends[backend.id];
	target.countIncomingPackets++;
	target.averageIncomingPacketSize = (
		(message.length + (target.countIncomingPackets - 1) * target.averageIncomingPacketSize)
		/
		target.countIncomingPackets
	);
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchMessageProxied = function (backend, message) {
	var frontend = this.metrics.frontend;
	frontend.countOutgoingPackets++;
	frontend.averageOutgoingPacketSize = (
		(message.length + (frontend.countOutgoingPackets - 1) * frontend.averageOutgoingPacketSize)
		/
		frontend.countOutgoingPackets
	);
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchBackendError = function (err, backend) {
	var target = this.metrics.backends[backend.id];
	target.countErrors++;
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchTimeoutReachedError = function (err, backend) {
	var target = this.metrics.backends[backend.id];
	target.countTimeoutErrors++;
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchBackendMessageForwarded = function (backend, message) {
	var target = this.metrics.backends[backend.id];
	target.countOutgoingPackets++;
	target.averageOutgoingPacketSize = (
		(message.length + (target.countOutgoingPackets - 1) * target.averageOutgoingPacketSize)
		/
		target.countOutgoingPackets
	);
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchBackendHealthy = function (backend) {
	var target = this.metrics.backends[backend.id];
	target.up = true;
	target.lastTimeUp = new Date();
	this._refreshFrontendUpStatus();
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._watchBackendUnhealthy = function (backend) {
	var target = this.metrics.backends[backend.id];
	target.up = false;
	target.lastTimeDown = new Date();
	this._refreshFrontendUpStatus();
	this.emit('change');
};

/**
 *
 */

Reporter.prototype._refreshFrontendUpStatus = function () {
	var reporter = this;
	var keys = Object.keys(this.metrics.backends);
	var totalUp = keys.reduce(function (count, id) {
		var backend = reporter.metrics.backends[id];
		return backend.up ? ++count : count;
	}, 0);
	this.metrics.frontend.up = totalUp > 0;
};