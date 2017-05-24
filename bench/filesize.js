'use strict';

// handle test files
const fs = require('fs-extra');
const path = require('path');
// manipulate images
const jimp = require('jimp');
const isize = require('image-size');
// structure for tests
const Middleware = require('./middleware');
// encoders
const imagemin = require('imagemin');
const jpegtran = require('imagemin-jpegtran');
const mozjpeg = require('imagemin-mozjpeg');
const guetzli = require('imagemin-guetzli');
const execFile = require('child_process').execFile;

const TEST_IN = process.argv[2];  // dir where test images are stored
const TEST_DIR = './test_temp';   // temporary dir for manipulating images

var AVG_BEFORE; // TODO make these not global
var AVG_AFTER;

// set up the test

var setup = function (callback) {
  fs.mkdir(TEST_DIR, () => {
    fs.copy(TEST_IN, TEST_DIR).then(() => {
      callback();
    });
  });
}

var teardown = function (callback) {
  fs.remove(TEST_DIR, () => {
    callback();
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
  return function (filename) {
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
  return function (filename) {
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

var useLibjpeg = function (quality) {
  return function (filename) {
    return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
      plugins: [
        jpegtran()
      ]
    });
  }
}

var useMozjpeg = function (quality) {
  return function (filename) {
    return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
      plugins: [
        mozjpeg()
      ]
    });
  }
}

var useGuetzli = function (quality) {
  return function (filename) {
    return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
      plugins: [
        guetzli()
      ]
    });
  }
}

// the test

var applyFn = function (fn, callback) {
  getSizeAvg(TEST_DIR).then((avg) => {
    AVG_BEFORE = avg;
  });

  readdirAsync(TEST_DIR).then((list) => {
    return Promise.all(list.map((file) => {
      file = path.resolve(TEST_DIR, file);
      return fn(file).then(() => {
        return;
      }).catch((err) => {
        console.log('function failed: ' + err);
      });
    }));
  }).then((results) => {
    getSizeAvg(TEST_DIR).then((avg) => {
      AVG_AFTER = avg
      console.log('ratio: ' + (AVG_AFTER / AVG_BEFORE).toString());
    });
    callback();
  }).catch((err) => {
    console.log('readdirAsync failed: ' + err);
  });
}

var addTest = function (name, middleware, fn) {
  middleware.use((next) => {
    setup(next);
  });
  middleware.use((next) => {
    console.time(name)
    applyFn(fn, next);
  });
  middleware.use((next) => {
    console.timeEnd(name);
    teardown(next);
  })
}

// create and run the test

var test = new Middleware();

/*test.use((next) => {
  console.log('first setup')
  setup(next);
});

test.use((next) => {
  applyFn(useGuetzli(5), next);
});
*/
addTest('resize-50%', test, resizeTo(0.5));
addTest('qf-50', test, qualityTo(0.5));
addTest('mozjpeg', test, useMozjpeg(1));
/*
test.use((next) => {
  console.log('last teardown')
  teardown(next);
});*/

test.go(() => {
  console.log('done');
});
