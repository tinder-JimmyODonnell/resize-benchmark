'use strict';

const path = require('path');

// Helpers
const getPath = function (filename) {
  return path.join(__dirname, filename);
};

module.exports = {
  inputJpg: getPath('input.jpg'),   // http://www.flickr.com/photos/grizdave/2569067123/
  inputJpgLarge: getPath('inputLarge.jpg'),
  inputPng: getPath('input.png'),   // http://c.searspartsdirect.com/lis_png/PLDM/50020484-00001.png
  inputWebP: getPath('input.webp'), // http://www.gstatic.com/webp/gallery/4.webp
  inputTiff: getPath('input.tif'),  // http://www.fileformat.info/format/tiff/sample/e6c9a6e5253348f4aef6d17b534360ab/index.htm
  inputGif: getPath('input.gif'),   // http://upload.wikimedia.org/wikipedia/commons/e/e3/Crash_test.gif
  outputJpg: getPath('output.jpg'),
  outputJpgLarge: getPath('outputLarge.jpg'),
  outputPng: getPath('output.png'),
  outputWebP: getPath('output.webp'),
  outputTiff: getPath('output.tiff'),
  outputGif: getPath('output.gif'),
  path: getPath
};
