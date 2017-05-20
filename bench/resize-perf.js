'use strict';

const fs = require('fs');

const async = require('async');
const assert = require('assert');
const Benchmark = require('benchmark');

// Contenders
const gm = require('gm');
const imagemagick = require('imagemagick');
const jimp = require('jimp');
const sharp = require('sharp');
let lwip;
try {
  lwip = require('lwip');
} catch (err) {
  console.log('Excluding lwip');
}

// test images
const fixtures = require('../fixtures');

//
const width = 100;
const height = 100;
const quality_factor = 100; // don't reduce quality yet

// Disable libvips cache to ensure tests are as fair as they can be
sharp.cache(false);
// Enable use of SIMD
sharp.simd(true);

console.log("Compare perf: jimp, lwip, gm, im, sharp");
async.series({
  // ======== JPEG SUITE ========
  'jpeg': function (callback) {
    const inputJpgBuffer = fs.readFileSync(fixtures.inputJpg);
    const jpegSuite = new Benchmark.Suite('jpeg');
    // jimp
    jpegSuite.add('jimp-file-file', {
      defer: true,
      fn: function (deferred) {
        jimp.read(fixtures.inputJpg, function (err, image) {
          if (err) {
            throw err;
          } else {
            image
              .resize(width, height)
              .quality(quality_factor)
              .write(fixtures.outputJpg, function (err) {
                if (err) {
                  throw err;
                } else {
                  deferred.resolve();
                }
              });
          }
        });
      }
    });
    // lwip
    if (typeof lwip !== 'undefined') {
      jpegSuite.add('lwip-file-file', {
        defer: true,
        fn: function (deferred) {
          lwip.open(fixtures.inputJpg, function (err, image) {
            if (err) {
              throw err;
            }
            image.resize(width, height, 'lanczos', function (err, image) {
              if (err) {
                throw err;
              }
              image.writeFile(fixtures.outputJpg, {quality: quality_factor}, function (err) {
                if (err) {
                  throw err;
                }
                deferred.resolve();
              });
            });
          });
        }
      });
    }
    // imagemagick
    jpegSuite.add('imagemagick-file-file', {
      defer: true,
      fn: function (deferred) {
        imagemagick.resize({
          srcPath: fixtures.inputJpg,
          dstPath: fixtures.outputJpg,
          quality: quality_factor/100,
          width: width,
          height: height,
          format: 'jpg',
          filter: 'Lanczos'
        }, function (err) {
          if (err) {
            throw err;
          } else {
            deferred.resolve();
          }
        });
      }
    });
    // gm
    jpegSuite.add('gm-file-file', {
      defer: true,
      fn: function (deferred) {
        gm(fixtures.inputJpg)
          .filter('Lanczos')
          .resize(width, height)
          .quality(quality_factor)
          .write(fixtures.outputJpg, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    });
    // sharp
    jpegSuite.add('sharp-file-file', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputJpg)
          .resize(width, height)
          .toFile(fixtures.outputJpg, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).on('cycle', function (event) {
      console.log('jpeg ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  },
  // ======== PNG SUITE ========
  'png': function (callback) {
    const inputPngBuffer = fs.readFileSync(fixtures.inputPng);
    const pngSuite = new Benchmark.Suite('png');
    // jimp
    pngSuite.add('jimp-file-file', {
      defer: true,
      fn: function (deferred) {
        jimp.read(fixtures.inputPng, function (err, image) {
          if (err) {
            throw err;
          } else {
            image
              .resize(width, height)
              .write(fixtures.outputPng, function (err) {
                if (err) {
                  throw err;
                } else {
                  deferred.resolve();
                }
              });
          }
        });
      }
    });
    // lwip
    if (typeof lwip !== 'undefined') {
      pngSuite.add('lwip-file-file', {
        defer: true,
        fn: function (deferred) {
          lwip.open(fixtures.inputPng, function (err, image) {
            if (err) {
              throw err;
            }
            image.resize(width, height, 'lanczos', function (err, image) {
              if (err) {
                throw err;
              }
              image.writeFile(fixtures.outputPng, {quality: quality_factor}, function (err) {
                if (err) {
                  throw err;
                }
                deferred.resolve();
              });
            });
          });
        }
      })
    }
    // imagemagick
    pngSuite.add('imagemagick-file-file', {
      defer: true,
      fn: function (deferred) {
        imagemagick.resize({
          srcPath: fixtures.inputPng,
          dstPath: fixtures.outputPng,
          width: width,
          height: height,
          filter: 'Lanczos'
        }, function (err) {
          if (err) {
            throw err;
          } else {
            deferred.resolve();
          }
        });
      }
    });
    // gm
    pngSuite.add('gm-file-file', {
      defer: true,
      fn: function (deferred) {
        gm(fixtures.inputPng)
          .filter('Lanczos')
          .resize(width, height)
          .write(fixtures.outputPng, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    });
    // sharp
    pngSuite.add('sharp-file-file', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputPng)
          .resize(width, height)
          .toFile(fixtures.outputPng, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).add('sharp-progressive', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputPng)
          .resize(width, height)
          .png({ progressive: true })
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-withoutAdaptiveFiltering', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputPng)
          .resize(width, height)
          .png({ adaptiveFiltering: false })
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    });
    pngSuite.on('cycle', function (event) {
      console.log(' png ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  },
  // ======== GIF SUITE ========
  'gif': function (callback) {
    const inputGifBuffer = fs.readFileSync(fixtures.inputGif);
    const gifSuite = new Benchmark.Suite('png');
    // jimp
    gifSuite.add('jimp-file-file', {
      defer: true,
      fn: function (deferred) {
        jimp.read(fixtures.inputGif, function (err, image) {
          if (err) {
            throw err;
          } else {
            image
              .resize(width, height)
              .quality(quality_factor)
              .write(fixtures.outputGif, function (err) {
                if (err) {
                  throw err;
                } else {
                  deferred.resolve();
                }
              });
          }
        });
      }
    })
    if (typeof lwip !== 'undefined') {
      gifSuite.add('lwip-file-file', {
        defer: true,
        fn: function (deferred) {
          lwip.open(fixtures.inputGif, function (err, image) {
            if (err) {
              throw err;
            }
            image.resize(width, height, 'lanczos', function (err, image) {
              if (err) {
                throw err;
              }
              image.writeFile(fixtures.outputGif, {quality: quality_factor}, function (err) {
                if (err) {
                  throw err;
                }
                deferred.resolve();
              });
            });
          });
        }
      })
    }
    // gm
    gifSuite.add('gm-file-file', {
      defer: true,
      fn: function (deferred) {
        gm(fixtures.inputGif)
          .filter('Lanczos')
          .resize(width, height)
          .write(fixtures.outputGif, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    })
    //sharp
    gifSuite.add('sharp-file-file', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputGif)
          .resize(width, height)
          .toFile(fixtures.outputGif, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).on('cycle', function (event) {
      console.log(' gif ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  },
  // ======== WEBP SUITE ========
  'webp': function (callback) {
    const inputWebPBuffer = fs.readFileSync(fixtures.inputWebP);
    (new Benchmark.Suite('webp')).add('sharp-file-file', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputWebP)
          .resize(width, height)
          .toFile(fixtures.outputWebP, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).on('cycle', function (event) {
      console.log('webp ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  },
  // ======== KERNEL SUITE ========
  'kernels': function (callback) {
    const inputJpgBuffer = fs.readFileSync(fixtures.inputJpg);
    (new Benchmark.Suite('kernels')).add('sharp-cubic', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height, { kernel: 'cubic' })
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-lanczos2', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height, { kernel: 'lanczos2' })
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-lanczos3', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height, { kernel: 'lanczos3' })
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).on('cycle', function (event) {
      console.log('kernels ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  }
}, function (err, results) {
  assert(!err, err);
  Object.keys(results).forEach(function (format) {
    if (results[format].toString().substr(0, 5) !== 'sharp') {
      console.log('sharp was slower than ' + results[format] + ' for ' + format);
    }
  });
  console.dir(sharp.cache());
});
