'use strict';

// handle test files
const fs = require('fs-extra');
const path = require('path');
const replaceExt = require('replace-ext');
// manipulate images
const jimp = require('jimp');
const sharp = require('sharp');
const gm = require('gm');
const isize = require('image-size');
// structure for tests
const Middleware = require('./middleware');
// encoders
const imagemin = require('imagemin');
const jpegtran = require('imagemin-jpegtran');
const mozjpeg = require('imagemin-mozjpeg');
const guetzli = require('imagemin-guetzli');
const pngquant = require('imagemin-pngquant');
const optipng = require('imagemin-optipng');
const pngcrush = require('imagemin-pngcrush');
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

var jimpResizeTo = function (factor) {
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
                console.log('jimpResize failed');
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

var sharpResizeTo = function (factor) {
  return function (filename) {
    return new Promise((resolve, reject) => {
      var newWidth = Math.trunc(isize(filename).width * factor);
      var newHeight = Math.trunc(isize(filename).height * factor);
      fs.rename(filename, filename + 'temp', () => {
        sharp(filename + 'temp')
          .resize(newWidth, newHeight)
          .toFile(filename, (err) => {
            if (err) {
              console.log('sharpResize failed');
              reject(err);
            } else {
              fs.remove(filename + 'temp', () => {
                resolve();
              })
            }
        });
      });
    });
  };
}

var jimpQualityTo = function (factor) {
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

var gmQualityTo = function (factor) {
  return function (filename) {
    return new Promise((resolve, reject) => {
      gm(filename)
        .quality(factor * 100)
        .write(filename, function (err) {
          if (err) {
            console.log('gmQualityTo failed');
            reject(err);
          } else {
            resolve();
          }
        });
    });
  };
}

var useLibjpeg = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      jpegtran()
    ]
  });
}

var useMozjpeg = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      mozjpeg()
    ]
  });
}

var useGuetzli = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      guetzli()
    ]
  });
}

var usePngcrush = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      pngcrush()
    ]
  });
}

var usePngquant = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      pngquant({ quality: '100' })
    ]
  });
}

var useOptipng = function (filename) {
  return imagemin([path.resolve(TEST_DIR, filename)], TEST_DIR, {
    plugins: [
      optipng()
    ]
  });
}

var sharpToJpg = function (filename) {
  return new Promise((resolve, reject) => {
    sharp(filename)
      .toFile(replaceExt(filename, '.jpg'), (err) => {
        if (err) {
          console.log('sharpToJpg failed');
          reject(err);
        } else {
          fs.remove(filename, () => {
            resolve();
          });
        }
    });
  });
}

var gmToJpg = function (filename) {
  return new Promise((resolve, reject) => {
    gm(filename)
      .write(replaceExt(filename, '.jpg'), function (err) {
        if (err) {
          console.log('gmToJpg failed');
          reject(err);
        } else {
          fs.remove(filename, () => {
            resolve();
          });
        }
      });
  });
}

// define test structure and iteration

var applyFn = function (fn1, fn2, callback) {
  getSizeAvg(TEST_DIR).then((avg) => {
    AVG_BEFORE = avg;
  });

  readdirAsync(TEST_DIR).then((list) => {
    return Promise.all(list.map((file) => {
      if (file === '.DS_Store') { return; }
      file = path.resolve(TEST_DIR, file);
      return fn1(file).then(() => {
        if (fn1 === sharpToJpg || fn1 === gmToJpg) {
          file = replaceExt(file, '.png');
        }

        if (typeof fn2 !== 'undefined') {
          return fn2(file).then(() => {
            return;
          });
        } else {
          return;
        }
      }).catch((err) => {
        console.log('function failed: ' + err);
        // TODO .DS_Store causes this to spit out false alarms
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

var addTest = function (name, middleware, fn1, fn2) {
  middleware.use((next) => {
    setup(next);
  });
  middleware.use((next) => {
    console.time(name)
    applyFn(fn1, fn2, next);
  });
  middleware.use((next) => {
    console.timeEnd(name);
    teardown(next);
  })
}

// create and run the tests

if (typeof TEST_IN === 'undefined') {
  throw new Error('Must specify location of test images: $ node filesize path_to_images');
} else if (!fs.existsSync(TEST_IN)) {
  throw new Error('Directory does not exist: ' + TEST_IN);
}

var test = new Middleware();

/*
// resize tests 10% --> 100%
addTest('sharp-resize-' + 1.00, test, sharpResizeTo(1.00));
addTest('sharp-resize-' + 0.90, test, sharpResizeTo(0.90));
addTest('sharp-resize-' + 0.80, test, sharpResizeTo(0.80));
addTest('sharp-resize-' + 0.70, test, sharpResizeTo(0.70));
addTest('sharp-resize-' + 0.60, test, sharpResizeTo(0.60));
addTest('sharp-resize-' + 0.50, test, sharpResizeTo(0.50));
addTest('sharp-resize-' + 0.40, test, sharpResizeTo(0.40));
addTest('sharp-resize-' + 0.30, test, sharpResizeTo(0.30));
addTest('sharp-resize-' + 0.20, test, sharpResizeTo(0.20));
addTest('sharp-resize-' + 0.10, test, sharpResizeTo(0.10));
// gm quality factor tests
addTest('gm-qf-100', test, gmQualityTo(1.00));
addTest('gm-qf-99', test, gmQualityTo(0.99));
addTest('gm-qf-98', test, gmQualityTo(0.98));
addTest('gm-qf-95', test, gmQualityTo(0.95));
addTest('gm-qf-90', test, gmQualityTo(0.90));
addTest('gm-qf-80', test, gmQualityTo(0.80));
addTest('gm-qf-70', test, gmQualityTo(0.70));
addTest('gm-qf-50', test, gmQualityTo(0.50));
addTest('gm-qf-25', test, gmQualityTo(0.25));
addTest('gm-qf-10', test, gmQualityTo(0.10));
// jimp quality factor tests
addTest('jimp-qf-100', test, jimpQualityTo(1.00));
addTest('jimp-qf-99', test, jimpQualityTo(0.99));
addTest('jimp-qf-98', test, jimpQualityTo(0.98));
addTest('jimp-qf-95', test, jimpQualityTo(0.95));
addTest('jimp-qf-90', test, jimpQualityTo(0.90));
addTest('jimp-qf-80', test, jimpQualityTo(0.80));
addTest('jimp-qf-50', test, jimpQualityTo(0.50));
/*
// encoder tests
addTest('libjpeg', test, useLibjpeg);
addTest('mozjpeg', test, useMozjpeg);
addTest('guetzli', test, useGuetzli);
// combination tests
addTest('sharp-resize-0.75-mozjpeg', test, sharpResizeTo(0.75), useMozjpeg);
addTest('sharp-resize-0.5-mozjpeg', test, sharpResizeTo(0.50), useMozjpeg);
addTest('sharp-resize-0.75-guetzli', test, sharpResizeTo(0.75), useGuetzli);
addTest('sharp-resize-0.5-guetzli', test, sharpResizeTo(0.50), useGuetzli);
// PNG tests
addTest('pngquant', test, usePngquant);
addTest('gm-tojpg', test, gmToJpg);
addTest('gm-tojpg-mozjpeg', test, gmToJpg, useMozjpeg);
addTest('sharp-tojpg-mozjpeg', test, sharpToJpg, useMozjpeg);
addTest('pngquant-gm-tojpg', test, usePngquant, gmToJpg);
*/

console.log('--- Compare file size ratios for resizing, QF, encodings ---');
test.go(() => {
  console.log('done');
});
