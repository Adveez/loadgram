'use strict';
/**
 * Module dependencies
 */

var mocha = require('mocha');
var assert = require('chai').assert;
var libPath = process.env.LOADGRAM_COV ? '../lib-cov' : '../lib';
var Reporter = require(libPath + '/reporter');
var dgram = require('dgram');

/**
 * Test suite
 */

describe('Reporter', function () {

});