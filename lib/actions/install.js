var _ = require('lodash');
var spawn = require('child_process').spawn;
var dargs = require('dargs');
var win32 = process.platform === 'win32';

var install = module.exports;

// Normalize a command across OS and spawn it
//
// - command    - A String containing a command to run
// - arguments  - An Array of arguments to pass the command
//
// Returns ChildProcess object (of the spawned command)
install.spawnCommand = function (command, args) {
  var winCommand = win32 ? 'cmd' : command;
  var winArgs = win32 ? ['/c ' + command + ' ' + args.join(' ')] : args;

  return spawn(winCommand, winArgs, { stdio: 'inherit' });
};

// Combine package manager cmd line arguments and run the "install" command
//
// - installer - A String containing the name of the package manager to use
// - paths     - A String or an Array of package name to install. Empty string for `npm install`
// - options   - [optional] The Hash of options to invoke `npm install` with. See `npm help install`.
// - callback  - [optional]
//
// Returns the generator instance.
install.runInstall = function (installer, paths, options, cb) {
  if (!cb && _.isFunction(options)) {
    cb = options;
    options = {};
  }

  options = options || {};
  cb = cb || function () {};
  paths = Array.isArray(paths) ? paths : (paths && paths.split(' ') || []);

  this.emit(installer + 'Install', paths);
  var args = ['install'].concat(paths).concat(dargs(options));

  install.spawnCommand(installer, args, cb)
    .on('err', cb)
    .on('exit', this.emit.bind(this, installer + 'Install:end', paths))
    .on('exit', function (err) {
      if (err === 127) {
        this.log.error('Could not find ' + installer + '. Please install with ' +
                            '`npm install -g ' + installer + '`.');
      }
      cb(err);
    });

  return this;
};


// Runs `npm` and `bower` in the generated directory concurrently and prints a
// message to let the user know.
//
// Options:
//  - npm: bool, whether to run `npm install`, default: true
//  - bower: bool, whether to run `bower install`, default: true
//  - skipInstall: bool, whether to skip automatic installation and just print a
//                 message to the user how to do it, default: false
//
// Example:
//
//   this.installDependencies({
//      bower: true,
//      npm: true,
//      skipInstall: false
//   });
//
// Returns the generator instance.
install.installDependencies = function (options) {
  var commands = [];
  var msgTemplate = _.template('\n\nI\'m all done. ' +
    '<%= skipInstall ? "Just run" : "Running" %> <%= commands.bold.yellow %> ' +
    '<%= skipInstall ? "" : "for you " %>to install the required dependencies.' +
    '<% if (!skipInstall) { %> If this fails, try running the command yourself.<% } %>\n\n');

  options = _.defaults(options || {}, {
    bower: true,
    npm: true,
    skipInstall: false
  });

  if (options.bower) {
    commands.push('bower install');
  }

  if (options.npm) {
    commands.push('npm install');
  }

  if (commands.length === 0) {
    throw new Error('installDependencies needs at least one of npm or bower to run.');
  }

  console.log(msgTemplate(_.extend(options, { commands: commands.join(' & ') })));

  if (!options.skipInstall) {
    if (options.bower) {
      this.bowerInstall();
    }
    if (options.npm) {
      this.npmInstall();
    }
  }
};

//
// Receives a list of `paths`, and an Hash of `options` to install through bower
//
// - paths     - A String or an Array of package name to install. Empty string for `bower install`
// - options   - [optional] The Hash of options to invoke `bower install` with. See `bower help install`.
// - callback  - [optional]
//
// Returns the generator instance.
install.bowerInstall = function install(paths, options, cb) {
  return this.runInstall('bower', paths, options, cb);
};


// Receives a list of `paths`, and an Hash of `options` to install through npm
//
// - paths     - A String or an Array of package name to install. Empty string for `npm install`
// - options   - [optional] The Hash of options to invoke `npm install` with. See `npm help install`.
// - callback  - [optional]
//
// Returns the generator instance.
install.npmInstall = function install(paths, options, cb) {
  return this.runInstall('npm', paths, options, cb);
};