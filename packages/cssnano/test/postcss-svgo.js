'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should optimise inline svg',
  processCss(
    'h1{background:url(\'data:image/svg+xml;utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise inline svg with standard charset definition',
  processCss(
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise inline svg without charset definition',
  processCss(
    'h1{background:url(\'data:image/svg+xml,<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="yellow" /><!--test comment--></svg>\')}',
    'h1{background:url(\'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve"><circle cx="50" cy="50" r="40" fill="%23ff0"/></svg>\')}'
  )
);

test(
  'should optimise uri-encoded inline svg',
  processCss(
    "h1{background:url('data:image/svg+xml;utf-8,%3C%3Fxml%20version%3D%221.0%22%20encoding%3D%22utf-8%22%3F%3E%3C!DOCTYPE%20svg%20PUBLIC%20%22-%2F%2FW3C%2F%2FDTD%20SVG%201.1%2F%2FEN%22%20%22http%3A%2F%2Fwww.w3.org%2FGraphics%2FSVG%2F1.1%2FDTD%2Fsvg11.dtd%22%3E%3Csvg%20version%3D%221.1%22%20id%3D%22Layer_1%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xmlns%3Axlink%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxlink%22%20xml%3Aspace%3D%22preserve%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22yellow%22%20%2F%3E%3C!--test%20comment--%3E%3C%2Fsvg%3E')}",
    "h1{background:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' xml:space='preserve'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0'/%3E%3C/svg%3E\")}"
  )
);
test.run();
