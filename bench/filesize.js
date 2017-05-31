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

var teardown = function (callback, name) {
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

var sharpResizeToFactor = function (factor) {
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

var sharpResizeToDims = function (w, h) {
  return function (filename) {
    return new Promise((resolve, reject) => {
      fs.rename(filename, filename + 'temp', () => {
        sharp(filename + 'temp')
          .resize(w, h)
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

var gmResizeToDims = function (w, h) {
  return function (filename) {
    return new Promise((resolve, reject) => {
      gm(filename)
        .resize(w, h)
        .write(filename, function (err) {
          if (err) {
            console.log('gmResizeToDims failed');
            reject(err);
          } else {
            resolve();
          }
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
            .quality(factor)
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
        .quality(factor)
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

var applyFn = function (fns, callback) {
  getSizeAvg(TEST_DIR).then((avg) => {
    AVG_BEFORE = avg;
  });

  readdirAsync(TEST_DIR).then((list) => {
    return Promise.all(list.map((file) => {
      if (file === '.DS_Store') { return; }
      file = path.resolve(TEST_DIR, file);

      // https://stackoverflow.com/questions/17757654/how-to-chain-a-variable-number-of-promises-in-q-in-order
      // why doesn't this work?
      /*return fns.reduce((prev, fn) => {
        return fn(file).then(() => {
          if (fn === sharpToJpg || fn === gmToJpg) {
            console.log('converting file extension');
            file = replaceExt(file, '.jpg');
            return prev;
          }
          console.log('processed ' + file);
          return prev;
        });
      }, () => {}).then(() => {
        console.log('end of chain');
        return;
      }).catch((err) => {
        console.log('chain failed: ' + err);
      });*/

      // this is really really bad but chaining isn't working

      if (typeof fns[0] !== 'undefined') {
        return fns[0](file).then(() => {
          if (fns[0] === sharpToJpg || fns[0] === gmToJpg) {
            file = replaceExt(file, '.jpg');
          }
          if (typeof fns[1] !== 'undefined') {
            return fns[1](file).then(() => {
              if (fns[1] === sharpToJpg || fns[1] === gmToJpg) {
                file = replaceExt(file, '.jpg');
              }
              if (typeof fns[2] !== 'undefined') {
                return fns[2](file).then(() => {
                  if (fns[2] === sharpToJpg || fns[2] === gmToJpg) {
                    file = replaceExt(file, '.jpg');
                  }
                  if (typeof fns[3] !== 'undefined') {
                    return fns[3](file).then(() => {
                      return;
                    })
                  } else return;
                })
              } else return;
            })
          } else return;
        })
      } else return;
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

var addTest = function (name, middleware, fns) {
  middleware.use((next) => {
    setup(next);
  });
  middleware.use((next) => {
    console.time(name)
    applyFn(fns, next)
  });
  middleware.use((next) => {
    console.timeEnd(name);
    teardown(next, name);
  })
}

// create and run the tests

if (typeof TEST_IN === 'undefined') {
  throw new Error('Must specify location of test images: $ node filesize path_to_images');
} else if (!fs.existsSync(TEST_IN)) {
  throw new Error('Directory does not exist: ' + TEST_IN);
}

var test = new Middleware();

// combo tests
//addTest('resize-qf-optimize', test, [sharpResizeToDims(640, 640), gmQualityTo(75), useMozjpeg]);
//addTest('resize-qf-optimize', test, [sharpResizeToDims(640, 640), gmQualityTo(75)]);
//addTest('resize-qf-optimize', test, [sharpResizeToDims(640, 640)]);
//addTest('resize-qf-optimize', test, [useMozjpeg]);

addTest('sharp-resize-gm-qf', test, [sharpResizeToDims(640, 640), gmQualityTo(75)]);
addTest('gm-resize-gm-qf', test, [gmResizeToDims(640, 640), gmQualityTo(75)]);


console.log('--- Compare file size ratios for resizing, QF, encodings ---');
test.go(() => {
  console.log('done');
});
