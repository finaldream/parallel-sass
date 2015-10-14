/**
 * Sass-worker that runs as child-process.
 *
 * @author Oliver Erdmann, <o.erdmann@finaldream.de>
 * @since 12.10.15
 */

'use strict';

var fs   = require('fs');
var _    = require('lodash');
var path = require('path');
var sass = require('node-sass');

var SassOptions = {
    outputStyle: 'compressed'
};

/**
 * Sass Worker.
 *
 * @param {object} options
 * @param {string} options.inputDir
 *
 * @constructor
 */
var SassWorker = function (options)
{
    this.options      = options || {};
    this.completed    = 0;
    this.threadID     = 0;
    this.files        = [];
    this.filesPending = 0;
};

/**
 * Run worker on provided files.
 * Calls `runSingle()`.
 *
 * @param {string[]} files Files to process.
 */
SassWorker.prototype.run = function (files)
{

    this.filesPending = files.length;

    for (var i = 0, l = files.length; i < l; i++) {
        this.runSingle(files[i]);
    }

};

/**
 * Runs worker on a single file, based on provided options.
 *
 * @param {string} file
 */
SassWorker.prototype.runSingle = function (file)
{

    var baseName = file;

    if (path.extname(baseName) != '.scss') {
        return;
    }

    if (baseName.indexOf('/') === 0) {
        baseName = path.basename(baseName);
    }

    var baseFileName = baseName.split('.')[0];
    var inFile       = path.join(this.options.inputDir, baseName);
    var outFile      = path.join(this.options.outputDir, baseFileName + '.css');

    this.renderFile(inFile, outFile);


};

/**
 * Renders a single file to a specified output location.
 *
 * @param {string} inFile
 * @param {string} outFile
 */
SassWorker.prototype.renderFile = function (inFile, outFile)
{

    process.send({
        action: 'rendering',
        threadID: this.threadID,
        inFile: inFile,
        outFile: outFile
    });

    var options = _.assign(
        {},
        SassOptions,
        this.options,
        {
            file: inFile,
            outFile: outFile,
            sourceMap: (this.options.sourceMap === true)? outFile + '.map': this.options.sourceMap
        }
    );

    sass.render(options,
        function (err, result)
        {

            if (err !== undefined && err !== null) {

                console.error(err);

                process.send({
                    error: err
                });
            } else {
                fs.writeFileSync(outFile, result.css);

                if (options.sourceMap) {
                    fs.writeFileSync(options.sourceMap, result.map);
                }

            }

            if (process.send) {
                process.send({
                    action: 'complete',
                    threadID: this.threadID,
                    inFile: inFile,
                    outFile: outFile,
                    stats: result.stats || {}
                });

            }

            this.filesPending--;

            if (this.filesPending > 0) {
                return;
            }

            process.send({
                action: 'finished',
                threadID: this.threadID
            });

        }.bind(this)
    );

};

/**
 * Handle Process-messages.
 * Creates a worker on sending the "run"-action.
 */
process.on('message', function (payload)
{

    if (payload === undefined || payload.action === undefined) {
        return;
    }

    switch (payload.action) {
        case 'run':

            var worker  = new SassWorker(payload.options);

            worker.threadID = payload.threadID;
            worker.run(payload.files);

            break;

    }

});
