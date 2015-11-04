/**
 * Module dependencies
 */

var util = require('util');

/**
 * Expose `NoBackendsAvailable` class
 */

module.exports = NoBackendsAvailable;


/**
 * Initialize a `NoBackendsAvailable` object
 * @constructor
 *
 * @inherits {Error}
 *
 * @api public
 */

function NoBackendsAvailable(){
  // N.B: Unfortunately the ES5 spec specifies that Error.call(this)
  // must always return a new object, and therefore it cannot be used for inheritance
  // See more section 15.11.1 of ECMA-262 5.1 Edition
  // http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf
  // Error.call(this);
  // Here in order to capture the stack we use Error.captureStackTrace
  // it sets this.stack
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this,arguments.callee);
  } else {
    var err = new Error();
    this.stack = err.stack;
  }
  this.name = 'NoBackendsAvailable';

  this.message = 'No backends available';
}

util.inherits(NoBackendsAvailable, Error);
