'use strict';
/**
 * Module dependencies
 */

var http = require('http');
var ws = require('ws');
var EventEmitter = require('events').EventEmitter;
var util = require('util');
var express = require('express');

/**
 * Middlewares
 */

var webui = require('./webui');
var api = require('./api');


/**
 * App class
 */

module.exports = App;

function App (options, reporters) {
	EventEmitter.call(this);
	this.port = options.port;
	this.webui = options.webui;
	this.api = options.api;
	this._app = express();
	this._app.set('reporters', reporters);
	this._app.set('refreshInterval', options.refreshInterval);
	this._httpServer = http.createServer(this._app);
	this._wsServer = new ws.Server({ server : this._httpServer });
	if (this.api || this.webui) this._mountAPI();
	if (this.webui) this._mountWebUI();
};
util.inherits(App, EventEmitter);

App.prototype.run = function () {
	var app = this;
	this._httpServer.listen(this.port, function () {
		app.emit('listening');
	});	
};

App.prototype._mountWebUI = function () {
	webui(this._app, this._wsServer);
};

App.prototype._mountAPI = function () {
	api(this._app);
};