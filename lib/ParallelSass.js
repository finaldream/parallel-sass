/**
 * Runs asyncronous and parallel Sass processes.
 *
 * Provides high-performance processing of a large numbers of sass files.
 *
 * @author Oliver Erdmann, <o.erdmann@finaldream.de>
 * @since 12.10.15
 */

'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var ChildProcess = require('child_process');
var cli = require('commander');
var Logging = require('./Logging');

var logger = (new Logging.Logger()).getInstance();
var Verbosity = Logging.Verbosity;

var DefaultOptions = {
    threads: 4,
    inputDir: '',
    outputDir: '',
    outputStyle: 'expanded',
    sourceComments: false,
    sourceMap: false,
    includePaths: [],
    verbose: 0
};

/**
 * ParallelSass App.
 *
 * @param {DefaultOptions} options
 * @constructor
 */
var ParallelSass = function(options) {
    this.options = DefaultOptions;


    // Consume options only if defined in DefaultOptions.
    for (var key in this.options) {
        if (!this.options.hasOwnProperty(key) || options[key] === undefined) {
            continue;
        }

        this.options[key] = options[key];
    }

    if (!_.isArray(this.options.includePaths)) {
        this.options.includePaths = [this.options.includePaths.toString()];
    }

    this.childrenPending = 0;
    logger.setVerbosity(this.options.verbose);

    logger.log(Verbosity.debug, "Options", this.options);

    // Bake scope.
    this.onWorkerMessage = this.onWorkerMessage.bind(this);

};


/**
 * Init Object.
 *
 * @param {string[]} [files] Optional array of files. If undefined, files are read from inputDir.
 */
ParallelSass.prototype.run = function(files) {

    if (files === undefined) {
        files = fs.readdirSync(this.options.inputDir);
    }

    var chunks = this.createChunks(files, this.options.threads);

    this.childrenPending = -1;

    logger.log(Verbosity.detail, 'Using ' + this.options.threads + ' threads');

    for (var i = 0, l = chunks.length; i < l; i++) {

        var child = ChildProcess.fork(
            path.join(__dirname, 'SassWorker.js'),
            chunks[i]
        );

        this.childrenPending++;

        child.on('message', this.onWorkerMessage);

        child.send({
            action: 'run',
            threadID: i,
            options: this.options,
            files: chunks[i]
        })
    }
};


/**
 * Creates chunks of files, based on the number of threads.
 *
 * @param {string[]} files Array of files.
 * @param {number} threads Number of chunks to create.
 *
 * @returns {array[]} A 2D-array of chunks of files.
 */
ParallelSass.prototype.createChunks = function(files, threads) {

    // Shortcut.
    if (threads < 2) {
        return [files];
    }

    var filesPerThread = Math.ceil(files.length / threads);
    var result = [];

    logger.log(Verbosity.debug, 'Files per thread: ' + filesPerThread + '.');

    for (var i = 0; i < threads; i++) {

        var chunk = files.slice(i * filesPerThread, (i + 1) * filesPerThread);

        result.push(chunk);
    }

    return result;

};

/**
 * Handles messages from workers.
 * Used for status output and signaling state (completion).
 *
 * @param {object} payload
 * @param {string} payload.action    Action to trigger
 * @param {number} payload.threadID  Thead sending
 * @param {string} [payload.inFile]  Input file
 * @param {string} [payload.outFile] Output file
 */
ParallelSass.prototype.onWorkerMessage = function(payload) {

    if (payload === undefined) {
        return;
    }

    if (payload.error !== undefined) {
        console.error(payload.error);
    }

    if (payload.action === undefined) {
        return;
    }

    switch (payload.action) {

        case 'complete':

            logger.log(Verbosity.basic, '[' + payload.threadID + ']', 'Completed', payload.inFile, 'to', payload.outFile);
            break;

        case 'rendering':
            logger.log(Verbosity.basic, '[' + payload.threadID + ']', 'Rendering file:', payload.inFile, 'to', payload.outFile);
            break;

        case 'finished':
            this.childrenPending--;

            logger.log(Verbosity.basic, '[' + payload.threadID + '] Finsihed.');

            if (this.childrenPending > 0) {
                break;
            }

            process.exit(0);

            break;

    }

};

module.exports = ParallelSass;
