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
let imagemagickNative;
try {
  imagemagickNative = require('imagemagick-native');
} catch (err) {
  console.log('Excluding imagemagick-native');
}
let lwip;
try {
  lwip = require('lwip');
} catch (err) {
  console.log('Excluding lwip');
}

// bonus: guetzli
const cp = require('child_process');
const guetzli = require('guetzli');

const fixtures = require('../fixtures');

const width = 200;
const height = 200;
const quality_factor = 100;

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
    jpegSuite.add('jimp-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        jimp.read(inputJpgBuffer, function (err, image) {
          if (err) {
            throw err;
          } else {
            image
              .resize(width, height)
              .quality(quality_factor)
              .getBuffer(jimp.MIME_JPEG, function (err) {
                if (err) {
                  throw err;
                } else {
                  deferred.resolve();
                }
              });
          }
        });
      }
    }).add('jimp-file-file', {
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
      }).add('lwip-buffer-buffer', {
        defer: true,
        fn: function (deferred) {
          lwip.open(inputJpgBuffer, 'jpg', function (err, image) {
            if (err) {
              throw err;
            }
            image.resize(width, height, 'lanczos', function (err, image) {
              if (err) {
                throw err;
              }
              image.toBuffer('jpg', {quality: quality_factor}, function (err, buffer) {
                if (err) {
                  throw err;
                }
                assert.notStrictEqual(null, buffer);
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
    // imagemagick-native
    if (typeof imagemagickNative !== 'undefined') {
      jpegSuite.add('imagemagick-native-buffer-buffer', {
        defer: true,
        fn: function (deferred) {
          imagemagickNative.convert({
            srcData: inputJpgBuffer,
            quality: quality_factor,
            width: width,
            height: height,
            format: 'JPEG',
            filter: 'Lanczos'
          }, function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
        }
      });
    }
    // gm
    jpegSuite.add('gm-buffer-file', {
      defer: true,
      fn: function (deferred) {
        gm(inputJpgBuffer)
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
    }).add('gm-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        gm(inputJpgBuffer)
          .filter('Lanczos')
          .resize(width, height)
          .quality(quality_factor)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('gm-file-file', {
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
    }).add('gm-file-buffer', {
      defer: true,
      fn: function (deferred) {
        gm(fixtures.inputJpg)
          .filter('Lanczos')
          .resize(width, height)
          .quality(quality_factor)
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
    // sharp
    jpegSuite.add('sharp-buffer-file', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height)
          .toFile(fixtures.outputJpg, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).add('sharp-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-file-file', {
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
    }).add('sharp-stream-stream', {
      defer: true,
      fn: function (deferred) {
        const readable = fs.createReadStream(fixtures.inputJpg);
        const writable = fs.createWriteStream(fixtures.outputJpg);
        writable.on('finish', function () {
          deferred.resolve();
        });
        const pipeline = sharp()
          .resize(width, height);
        readable.pipe(pipeline).pipe(writable);
      }
    }).add('sharp-file-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputJpg)
          .resize(width, height)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-promise', {
      defer: true,
      fn: function (deferred) {
        sharp(inputJpgBuffer)
          .resize(width, height)
          .toBuffer()
          .then(function (buffer) {
            assert.notStrictEqual(null, buffer);
            deferred.resolve();
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
    pngSuite.add('jimp-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        jimp.read(inputPngBuffer, function (err, image) {
          if (err) {
            throw err;
          } else {
            image
              .resize(width, height)
              .getBuffer(jimp.MIME_PNG, function (err) {
                if (err) {
                  throw err;
                } else {
                  deferred.resolve();
                }
              });
          }
        });
      }
    }).add('jimp-file-file', {
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
      pngSuite.add('lwip-buffer-buffer', {
        defer: true,
        fn: function (deferred) {
          lwip.open(inputPngBuffer, 'png', function (err, image) {
            if (err) {
              throw err;
            }
            image.resize(width, height, 'lanczos', function (err, image) {
              if (err) {
                throw err;
              }
              image.toBuffer('png', function (err, buffer) {
                if (err) {
                  throw err;
                }
                assert.notStrictEqual(null, buffer);
                deferred.resolve();
              });
            });
          });
        }
      });
    }
    // ======== PNG SUITE ========
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
    // imagemagick-native
    if (typeof imagemagickNative !== 'undefined') {
      pngSuite.add('imagemagick-native-buffer-buffer', {
        defer: true,
        fn: function (deferred) {
          imagemagickNative.convert({
            srcData: inputPngBuffer,
            width: width,
            height: height,
            format: 'PNG',
            filter: 'Lanczos'
          });
          deferred.resolve();
        }
      });
    }
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
    }).add('gm-file-buffer', {
      defer: true,
      fn: function (deferred) {
        gm(fixtures.inputPng)
          .filter('Lanczos')
          .resize(width, height)
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
    // sharp
    pngSuite.add('sharp-buffer-file', {
      defer: true,
      fn: function (deferred) {
        sharp(inputPngBuffer)
          .resize(width, height)
          .toFile(fixtures.outputPng, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).add('sharp-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(inputPngBuffer)
          .resize(width, height)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-file-file', {
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
    }).add('sharp-file-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputPng)
          .resize(width, height)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-progressive', {
      defer: true,
      fn: function (deferred) {
        sharp(inputPngBuffer)
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
        sharp(inputPngBuffer)
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
  // ======== WEBP SUITE ========
  'webp': function (callback) {
    const inputWebPBuffer = fs.readFileSync(fixtures.inputWebP);
    (new Benchmark.Suite('webp')).add('sharp-buffer-file', {
      defer: true,
      fn: function (deferred) {
        sharp(inputWebPBuffer)
          .resize(width, height)
          .toFile(fixtures.outputWebP, function (err) {
            if (err) {
              throw err;
            } else {
              deferred.resolve();
            }
          });
      }
    }).add('sharp-buffer-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(inputWebPBuffer)
          .resize(width, height)
          .toBuffer(function (err, buffer) {
            if (err) {
              throw err;
            } else {
              assert.notStrictEqual(null, buffer);
              deferred.resolve();
            }
          });
      }
    }).add('sharp-file-file', {
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
    }).add('sharp-file-buffer', {
      defer: true,
      fn: function (deferred) {
        sharp(fixtures.inputWebp)
          .resize(width, height)
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
