'use strict';
/**
 * Module dependencies
 */

var mocha = require('mocha');
var assert = require('chai').assert;
var libPath = process.env.LOADGRAM_COV ? '../lib-cov' : '../lib';
var Loadgram = require(libPath + '/loadgram');
var dgram = require('dgram');

/**
 * Test suite
 */

describe('Loadgram', function () {
	var defaultOptions = {	
		port : 3535,
		strategy : 'roundrobin',
		healthcheck : {
			enabled : true,
			interval : 10000,
			retries : 3,
			packet : {
				message : '01',
				encoding : 'hex'
			}
		},
		backends : [
			{
				host : 'localhost',
				port : 4000,
				backup : false,
				timeout : 5000
			},
			{
				host : 'localhost',
				port : 4010,
				backup : true,
				timeout : 5000
			}
		]
	};
	describe('new', function () {
		it('should create an instance of Loadgram', function () {
			var lg = new Loadgram(defaultOptions);
			assert.instanceOf(lg, Loadgram);
			assert.strictEqual(defaultOptions.port, lg.port);
			assert.strictEqual(defaultOptions.strategy, lg.strategy);
			assert.strictEqual(defaultOptions.healthcheck, lg.healthcheck);
			assert.deepEqual(defaultOptions.backends.map(lg._flagAsHealthy), lg.backends);
			assert.deepEqual(defaultOptions.backends.map(lg._flagAsHealthy), lg.healthyBackends);
		});
	});

	describe('#getHealthyBackends()', function () {
		it('should return the healthy backends', function () {
			var lg = new Loadgram(defaultOptions);
			assert.deepEqual(defaultOptions.backends.map(lg._flagAsHealthy), lg.getHealthyBackends());
		});
	});

	describe('#_refreshBackendPicker()', function () {
		it.skip('should refresh the backend picker', function () {

		});
	});

	describe('#bind()', function () {
		it('should listen on the given port', function (done) {
			var lg = new Loadgram(defaultOptions);
			lg.on('listening', function () {
				lg.close(done);
			});
			lg.bind();
		});
	});

	describe('#_onListening()', function () {
		it('should emit the listening event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			lg.on('listening', function () {
				done();
			});
			lg._onListening();
		});
	});

	describe('#_onBackendError()', function () {
		it('should emit the "backend::error" event and the "error" event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			var expectedError = new Error('Some error');
			var expectedBackend = defaultOptions.backends[0];
			var isDone = false;
			lg.on('backend::error', function (err, backend) {
				assert.deepEqual(expectedError, err);
				assert.deepEqual(expectedBackend, backend);
				if (isDone) done();
				isDone = true;
			});
			lg.on('error', function (err) {
				assert.deepEqual(expectedError, err);
				if (isDone) done();
				isDone = true;
			});
			lg._onBackendError(expectedError, expectedBackend);
		});
	});

	describe('#_onBackendTimeoutReachedError()', function () {
		it('should emit the "backend::timeout-reached-error" event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			var expectedError = new Error('Some error');
			var expectedBackend = defaultOptions.backends[0];
			lg.on('backend::timeout-reached-error', function (err, backend) {
				assert.deepEqual(expectedError, err);
				assert.deepEqual(expectedBackend, backend);
				done();
			});
			lg._onBackendTimeoutReachedError(expectedError, expectedBackend);
		});
	});

	describe('#_onError()', function () {
		it('should emit the "error" event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			var expectedError = new Error('Some error');
			lg.on('error', function (err) {
				assert.deepEqual(expectedError, err);
				done();
			});
			lg._onError(expectedError);
		});
	});

	describe('#_onMessageProxied()', function () {
		it('should emit the "message-proxied" event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			var expectedBackend = defaultOptions.backends[0];
			var expectedMessage = new Buffer(10);
			lg.on('message-proxied', function (backend, message) {
				assert.deepEqual(expectedBackend, backend);
				assert.deepEqual(expectedMessage, message);
				done();
			});
			lg._onMessageProxied(expectedBackend, expectedMessage);
		});
	});

	describe('#_onBackendMessageForwarded()', function () {
		it('should emit the "backend::message-forwarded" event when called', function (done) {
			var lg = new Loadgram(defaultOptions);
			var expectedBackend = defaultOptions.backends[0];
			var expectedMessage = new Buffer(10);
			lg.on('backend::message-forwarded', function (backend, message) {
				assert.deepEqual(expectedBackend, backend);
				assert.deepEqual(expectedMessage, message);
				done();
			});
			lg._onBackendMessageForwarded(expectedBackend, expectedMessage);
		});
	});

	describe('#_onBackendHealthy()', function () {
		it('should add the backend given', function () {
			var lg = new Loadgram(defaultOptions);
			var expectedBackend = [{
				host : 'localhost',
				port : 4000,
				backup : false,
				timeout : 5000
			}].map(lg._flagAsHealthy);
			lg._onBackendHealthy(expectedBackend);
			assert.isNotNull(lg.healthyBackends.indexOf(expectedBackend));
			assert.isTrue(expectedBackend.healthy);
		});
	});

	describe('#_onBackendUnhealthy()', function () {
		it('should add the backend given', function () {
			var lg = new Loadgram(defaultOptions);
			var expectedBackend = [{
				host : 'localhost',
				port : 4000,
				backup : false,
				timeout : 5000
			}].map(lg._flagAsHealthy);
			lg._onBackendUnhealthy(expectedBackend);
			assert.strictEqual(-1, lg.healthyBackends.indexOf(expectedBackend));
			assert.isFalse(expectedBackend.healthy);
		});
	});

	describe('#_onMessage()', function () {
		it.skip('should ...', function () {

		});
	});

	describe('#_sendMessage()', function () {
		it.skip('should ...', function () {

		});
	});

	describe('#startHealthCheck()', function () {
		it.skip('should ...', function () {

		});
	});

	describe('#_startHealthCheckOnBackend()', function () {
		it.skip('should ...', function () {

		});
	});

	describe('#stopHealthCheck()', function () {
		it.skip('should ...', function () {

		});
	});

	describe('#_flagAsHealthy()', function () {
		it('should add the backend given', function () {
			var lg = new Loadgram(defaultOptions);
			var backend = {
				host : 'localhost',
				port : 4000,
				backup : false,
				timeout : 5000
			};
			lg._flagAsHealthy(backend, 10);
			assert.strictEqual(10, backend.id);
			assert.strictEqual(true, backend.healthy);
			assert.strictEqual(0, backend.failedChecks);
		});
	});
});