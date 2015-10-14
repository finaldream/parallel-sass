/**
 * Generic class for logging data to the console using a defined verbosity-level.
 */

'use strict';

var _instance;

/**
 * Verbosity Levels.
 */
var Verbosity = {
    none: 0,
    basic: 1,
    detail: 2,
    debug: 3
};


/**
 * Provides logging-functions.
 *
 * This is a singleton class. Don't call the constructor, call `instance()` instead.
 */
var Logger = function ()
{
    _instance = this;
};


/**
 * Gets or creates the instance.
 *
 * @returns {Logger}
 */
Logger.prototype.getInstance = function ()
{

    if (!_instance) {
        _instance = new Logger();
    }

    return _instance;

};


/**
 * @param {Verbosity} verbosity Level of verbosity.
 */
Logger.prototype.setVerbosity = function (verbosity)
{
    this.verbosity = verbosity;
};


/**
 * Logs data to console.log, if verbosity-level is met.
 *
 * @param {number} level Required verbosity-level
 * @param {...*}   args  Arguments to log.
 *
 * @returns void
 */
Logger.prototype.log = function ()
{
    var args = Array.prototype.slice.call(arguments, 0, arguments.length);


    if (args.length < 2) {
        return;
    }

    var verbLevel = args.shift();

    if (verbLevel > this.verbosity) {
        return;
    }

    console.log.apply(this, args);

};


module.exports = {
    Logger: Logger,
    Verbosity: Verbosity
};