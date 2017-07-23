'use strict';

var path = require('path');
var Kefir = require('kefir');
var kefirGlob = require('./kefir-glob');
var kefirCopyFile = require('./kefir-copy-file');

module.exports = function flowCopySource(sources, dest, options) {
  var verbose = options && options.verbose;
  var ignore = options && options.ignore;
  var watch = options && options.watch;
  var filePattern = options && options.filePattern;

  return Kefir.merge(
      sources.map(src => {
        var filesToCopy;
        if (watch) {
          var chokidar = require('chokidar');
          var watcher = chokidar.watch(filePattern, {cwd: src, ignored: ignore});
          filesToCopy = Kefir.merge([
            Kefir.fromEvents(watcher, 'add'),
            Kefir.fromEvents(watcher, 'change')
          ]);
        } else {
          filesToCopy = kefirGlob(filePattern, {cwd: src, strict: true, ignore});
        }

        return filesToCopy.map(match => ({src, match}));
      })
    )
    .flatMap(pair =>
      kefirCopyFile(
        path.join(pair.src, pair.match),
        path.join(dest, pair.match+'.flow')
      )
    )
    .takeErrors(1)
    .onValue(result => {
      if (verbose) {
        console.log(result.src, '->', result.dest);
      }
    })
    .scan((list, result) => {
      list.push(result);
      return list;
    }, [])
    .toPromise();
};
