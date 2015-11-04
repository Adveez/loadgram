'use strict';
/**
 * Module dependencies
 */

var figc = require('figc');
var config = figc(__dirname + '/config.json');
var superconsole = require('superconsole');
var lib = require('./../index');
var Loadgram = lib.Loadgram;
var Reporter = lib.Reporter;

/**
 * Print out error when uncaught exception happens
 *  then exit
 */

process.on('uncaughtException', function (err) {
  console.log((new Date).toUTCString() + ' uncaughtException:', err.message);
  console.error(err)
  process.exit(1)
});

/**
 * Setup console logger
 */

superconsole({
  callsite : true,
  level : true,
  timestamp : true,
  logLevel : config.logLevel,
  colors : true
});

/**
 * Check configuration
 */

 // TODO

/**
 * Setup load balancers
 */

var reporters = [];

config.frontends.forEach(function (frontend) {
	var lb = new Loadgram(frontend);
	lb.on('listening', function () {
		console.info('Load balancer listening on port ', frontend.port);
	});
	lb.on('backend::error', function (err, backend) {
		console.error(err);
	});
	lb.on('error', function (err) {
		console.error(err);
	});
	lb.on('backend::unhealthy', function (backend) {
		console.warn('Backend unhealthy', backend.host);
	});
	lb.on('backend::healthy', function (backend) {
		console.info('Backend healthy', backend.host);
	});
	var reporter = new Reporter(lb);
	reporters.push(reporter);
	lb.bind();
});

setInterval(function () {
	reporters.map(function (report) {
		console.log(report.getMetrics());
	});
}, 2000);