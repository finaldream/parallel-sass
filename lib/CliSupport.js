'use strict';

var cli       = require('commander');
var Verbosity = require('./Logging').Verbosity;

module.exports = {
    parseCLI: function (argv, pkgJson)
    {
        function cliIncreaseVerbosity (value, total)
        {
            return total + 1;
        };

        function cliValidateIncludePath (value)
        {
            if (typeof value === 'string') {
                return [value];
            }

            return value;
        };

        var desc    = ['Parallel Sass, Version ' + pkgJson.version, pkgJson.description].join('\n');
        var options = {};

        cli.version(pkgJson.version)
            .description(desc)
            .usage('[options] <input-dir> <output-dir>')
            .option('--threads <n>', 'Number of threads.', parseInt)
            .option(
                '-t, --output-style <style>',
                'Output style (compressed|compact|expanded|nested) [expanded].',
                /^(compressed|compact|expanded|nested)$/i,
                'expanded'
            )
            .option('-I, --include-paths <path>', 'Set Sass import path.')
            .option('--source-comments', 'Enables additional debugging information in the output file as CSS comments.')
            .option('--source-map', 'Enables the outputting of a source map.')
            .option('-v, --verbose', 'Verbose output. -v = basic, -vv = detailed, -vvv = debug.', cliIncreaseVerbosity, 0)
            .parse(argv);

        cli.inputDir  = cli.args[0];
        cli.outputDir = cli.args[1];

        return cli;
    }
}
