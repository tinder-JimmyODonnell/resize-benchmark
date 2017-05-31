# resize-benchmark

Contains several tests comparing the performance and effectiveness of compression, resizing, and optimization operations in various image processing libraries.

Install external dependencies: ImageMagick and GraphicsMagick.
On macOS: `brew install imagemagick graphicsmagick`
On Ubuntu: `sudo apt-get install imagemagick libmagick++-dev graphicsmagick`

`resize-perf.js` uses benchmark.js to perform benchmark tests of resizing operations for five libraries: jimp, lwip, ImageMagick, GraphicsMagick, and Sharp.
`quality-perf` uses benchmark.js to perform benchmark tests of quality conversion operations for four libraries: jimp, lwip, ImageMagick, and GraphicsMagick.
`filesize.js` can test combinations of compression, resizing, and optimization operations from different libraries on large batches of images. It requires a path to a test image directory as an argument.

To run:
`cd bench; npm install`
`node resize-perf; node quality-perf; node filesize PATH_TO_TEST_IMAGE_DIR`

You may see warnings from libvips such as `"vips warning: VipsJpeg: error reading resolution"` -- these are harmless and safe to ignore.
