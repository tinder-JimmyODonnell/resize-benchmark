'use strict';

const fs = require('fs');

const async = require('async');
const assert = require('assert');
const Benchmark = require('benchmark');
const isize = require('image-size');

// Contenders
const gm = require('gm');
const imagemagick = require('imagemagick');
const jimp = require('jimp');
let lwip;
try {
  lwip = require('lwip');
} catch (err) {
  console.log('Excluding lwip');
}

// test images
const fixtures = require('../fixtures');

const quality_factor = 50;

console.log('--- Compare quality conversion perf: jimp, lwip, gm, im ---');
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
            image.writeFile(fixtures.outputJpg, {quality: quality_factor}, function (err) {
              if (err) {
                throw err;
              }
              deferred.resolve();
            });
          });
        }
      });
    }
    // imagemagick
    jpegSuite.add('imagemagick-file-file', {
      defer: true,
      fn: function (deferred) {
        var newWidth = isize(fixtures.inputJpg).width
        imagemagick.resize({
          srcPath: fixtures.inputJpg,
          dstPath: fixtures.outputJpg,
          quality: quality_factor/100,
          width: newWidth,
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
    jpegSuite.on('cycle', function (event) {
      console.log('jpeg ' + String(event.target));
    }).on('complete', function () {
      callback(null, this.filter('fastest').map('name'));
    }).run();
  }
}, function (err, results) {
  assert(!err, err);
});
