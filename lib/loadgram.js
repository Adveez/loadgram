'use strict';
/**
 * Module dependencies
 */

var dgram = require('dgram');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var roundround = require('roundround');
var TimeoutReached = require('./errors/timeout-reached');
var NoBackendsAvailable = require('./errors/no-backends-available');

/**
 * Expose `Loadgram` class
 */

module.exports = Loadgram;

/**
 * `Loadgram` class
 * @inherits EventEmitter
 *
 * @param {Object} options -
 *
 * @constructor
 */

function Loadgram(options) {
	EventEmitter.call(this);
	this.socket = null;
	this.port = options.port;
	this.healthcheck = options.healthcheck;
	this.backends = options.backends.map(this._flagAsHealthy);
	this.healthyBackends = [].concat(this.backends); // shallow copy, new reference

	this.strategy = options.strategy;
	if (this.strategy !== 'roundrobin') {
		throw new Error('Load balancing strategy "' + this.strategy + '" is not supported.');
	}

	this._refreshBackendPicker();
};

util.inherits(Loadgram, EventEmitter);

/**
 * 
 */

Loadgram.prototype.getHealthyBackends = function () {
	return this.healthyBackends;
};

/**
 *
 */

Loadgram.prototype._refreshBackendPicker = function () {
	var healthyBackendsWithoutBackup = this.healthyBackends.filter(function (backend) {
		return !backend.backup;
	});
	if (healthyBackendsWithoutBackup.length > 0) {
		this.pickHealthyBackend = roundround(healthyBackendsWithoutBackup);
	} else {
		this.pickHealthyBackend = roundround(this.healthyBackends);
	}
	
};

/**
 *
 */

Loadgram.prototype.bind = function () {
	this.socket = dgram.createSocket('udp4');
	this.socket.on('message', this._onMessage.bind(this));
	this.socket.on('listening', this._onListening.bind(this));
	this.on('backend::unhealthy', this._onBackendUnhealthy.bind(this));
	this.on('backend::healthy', this._onBackendHealthy.bind(this));
	if (this.healthcheck.enabled) this.startHealthCheck();
	this.socket.bind(this.port);
};

/**
 *
 */

Loadgram.prototype._onListening = function () {
	this.emit('listening');
};

/**
 *
 */

Loadgram.prototype._onBackendError = function (err, backend) {
	this.emit('backend::error', err, backend);
	this._onError(err);
};

/**
 *
 */

Loadgram.prototype._onBackendTimeoutReachedError = function (err, backend) {
	this.emit('backend::timeout-reached-error', err, backend);
};

Loadgram.prototype._onError = function (err) {
	this.emit('error', err);
};

/**
 *
 */

Loadgram.prototype._onMessageProxied = function (backend, message) {
	this.emit('message-proxied', backend, message);
};

/**
 *
 */

Loadgram.prototype._onBackendMessageForwarded = function (backend, message) {
	this.emit('backend::message-forwarded', backend, message);
};

/**
 *
 */

Loadgram.prototype._onBackendHealthy = function (backend) {
	this.healthyBackends.push(backend);
	backend.healthy = true;
	this._refreshBackendPicker();
};

/**
 *
 */

Loadgram.prototype._onBackendUnhealthy = function (backend) {
	var index = this.healthyBackends.indexOf(backend);
	this.healthyBackends.splice(index, 1);
	backend.healthy = false;
	this._refreshBackendPicker();
};

/**
 *
 */

Loadgram.prototype._onMessage = function (message, rinfo) {
	var lb = this;
	var backend = this.pickHealthyBackend();
	if (!backend) return this._onError(new NoBackendsAvailable());
	this.emit('message-received', backend, message);
	this._sendMessage(backend, message, function (err, rmessage) {
		if (err instanceof TimeoutReached) {
			return lb._onBackendTimeoutReachedError(err, backend);
		} else if (err) {
			return lb._onBackendError(err, backend);
		}
		lb._onBackendMessageForwarded(backend, rmessage);
		lb.socket.send(rmessage, 0, rmessage.length, rinfo.port, rinfo.address, function (err) {
			if (err) {
				return lb._onError(err);
			}
			lb._onMessageProxied(backend, rmessage);
		});
	});
};

Loadgram.prototype._sendMessage = function (server, message, callback) {
	var lb = this;
	var client = dgram.createSocket('udp4');
	var idTimeout = setTimeout(function () {
		client.close();
		callback(new TimeoutReached(server.host, server.port, message, server.timeout));
	}, server.timeout);
	client.on('message', function (rmessage, srinfo) {
		clearTimeout(idTimeout);
		client.close();
		callback(null, rmessage);
	});
	client.send(message, 0, message.length, server.port, server.host, function (err) {
		if (err) {
			if (idTimeout) clearTimeout(idTimeout);
			client.close();
			callback(err);
		}
	});
};

/**
 *
 */

Loadgram.prototype.startHealthCheck = function () {
	var lb = this;
	this.backends.forEach(this._startHealthCheckOnBackend.bind(this));
	this.emit('healthcheck::started');
};

/**
 *
 */

Loadgram.prototype._startHealthCheckOnBackend = function (backend) {
	var lb = this;
	var sendMessage = function sendMessage() {
		console.debug('Send health check for ', backend.host, backend.failedChecks);
		var message = new Buffer(lb.healthcheck.packet.message, lb.healthcheck.packet.encoding);
		lb._sendMessage(backend, message, function (err, rmessage) {
			console.debug('Health check sent, with error ?:', err);
			var hasError = (err || (!err && Buffer.compare(message, rmessage) !== 0));
			if (hasError && backend.failedChecks < 3) {
				backend.failedChecks++;
				if (backend.failedChecks >= lb.healthcheck.retries && backend.healthy) {
					lb.emit('backend::unhealthy', backend);
				}
			} else if (!hasError && backend.failedChecks > 0) {
				backend.failedChecks--;
				if (backend.failedChecks === 0 && backend.healthy === false) {
					lb.emit('backend::healthy', backend);
				}
			}
		});
	};
	backend.idInterval = setInterval(sendMessage, lb.healthcheck.interval);
};

/**
 *
 */

Loadgram.prototype.stopHealthCheck = function () {
	this.backends.forEach(function (backend) {
		clearInterval(backend.idInterval);
	});
	this.emit('healthcheck::stopped');
};

/**
 *
 */

Loadgram.prototype._flagAsHealthy = function (backend, index) {
	backend.id = index;
	backend.healthy = true;
	backend.failedChecks = 0;
	return backend;
};