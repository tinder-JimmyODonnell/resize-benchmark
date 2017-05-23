'use strict';

const fs = require('fs-extra');
const path = require('path');
const jimp = require('jimp');
const isize = require('image-size');

const TEST_IN = process.argv[2];
const TEST_DIR = './test_temp';

var AVG_BEFORE; // TODO make these not global
var AVG_AFTER;

// set up the test

var setup = function (next) {
  fs.mkdir(TEST_DIR, () => {
    fs.copy(TEST_IN, TEST_DIR).then(() => {
      next();
    });
  });
}

var teardown = function () {
  fs.remove(TEST_DIR, () => {
    //console.log('teardown complete');
  });
}

// file reading helpers

var readdirAsync = function(dir) {
  return new Promise(function(resolve, reject) {
    fs.readdir(dir, function(err, list) {
      if (err) {
        reject(err);
      } else {
        resolve(list);
      }
    });
  });
}

var getSizeAvg = function(dir) {
  return readdirAsync(dir).then((list) => {
    return Promise.all(list.map((file) => {
      file = path.resolve(dir, file);
      return fs.statSync(file).size;
    }));
  }).then((results) => {
    return results.reduce(function(a, b) { return a + b; }) / results.length;
  });
}

// procedures

var resizeTo = function (factor) {
  return function (filename, next) {
    return new Promise((resolve, reject) => {
      jimp.read(filename, function (err, image) {
        if (err) {
          reject(err);
        } else {
          var newWidth = isize(filename).width * factor;
          var newHeight = isize(filename).height * factor;
          image
            .resize(newWidth, newHeight)
            .write(filename, function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
        }
      });
    });
  };
}

var qualityTo = function (factor) {
  return function (filename, next) {
    return new Promise((resolve, reject) => {
      jimp.read(filename, function (err, image) {
        if (err) {
          reject(err);
        } else {
          image
            .quality(factor * 100)
            .write(filename, function (err) {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
        }
      });
    });
  };
}

// the test

var test = function (fn, next) {
  getSizeAvg(TEST_DIR).then((avg) => {
    AVG_BEFORE = avg;
  });

  readdirAsync(TEST_DIR).then((list) => {
    return Promise.all(list.map((file) => {
      file = path.resolve(TEST_DIR, file);
      return fn(file).then(() => {
        return;
      }).catch((err) => {
        //console.log('failed');
        //console.log(err);
      });
    }));
  }).then((results) => {
    getSizeAvg(TEST_DIR).then((avg) => {
      AVG_AFTER = avg
      console.log('ratio: ' + (AVG_AFTER / AVG_BEFORE).toString());
    });
    next();
  }).catch((err) => {
    //console.log('FAILED');
  });
}

if ((typeof process.argv[2] === 'undefined')
  || (typeof process.argv[3] === 'undefined')) {
  throw new Error('usage: node filesize path_to_test_images factor');
}

// run
// TODO automate this to run for all desired resize/quality factors in sequence
console.log('--- factor: ' + process.argv[3] + ' ---')
setup(() => {
  test(qualityTo(process.argv[3]), () => {
    teardown();
  })
});
