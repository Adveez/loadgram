'use strict';
/**
 * Module dependencies
 */

var EventEmitter = require('events').EventEmitter;
var util = require('util');

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

Reporter.prototype.getMetrics = function () {
	return this.metrics;
};

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
	)
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
	)
};

/**
 *
 */

Reporter.prototype._watchBackendError = function (err, backend) {
	var target = this.metrics.backends[backend.id];
	target.countErrors++;
};

/**
 *
 */

Reporter.prototype._watchTimeoutReachedError = function (err, backend) {
	var target = this.metrics.backends[backend.id];
	target.countTimeoutErrors++;
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
	)
};

/**
 *
 */

Reporter.prototype._watchBackendHealthy = function (backend) {
	var target = this.metrics.backends[backend.id];
	target.up = true;
	target.lastTimeUp = new Date();
	this._refreshFrontendUpStatus();
};

/**
 *
 */

Reporter.prototype._watchBackendUnhealthy = function (backend) {
	var target = this.metrics.backends[backend.id];
	target.up = false;
	target.lastTimeDown = new Date();
	this._refreshFrontendUpStatus();
};

/**
 *
 */

Reporter.prototype._refreshFrontendUpStatus = function () {
	var reporter = this;
	this.metrics.frontend.up = Object.keys(this.metrics.backends).reduce(function (status, id) {
		var backend = reporter.metrics.backends[id];
		return status && backend.up;
	}, false);
};