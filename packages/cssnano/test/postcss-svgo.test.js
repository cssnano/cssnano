import { test } from 'node:test';
import postcss from 'postcss';
import assert from 'node:assert/strict';
import postcssSvgo from 'postcss-svgo';
import cssnano from '../src/index.js';

// postcss-svgo is not part of the default preset; this is the documented way
// to keep optimizing inline SVG.
const processor = postcss([postcssSvgo(), cssnano()]);

function processCss(fixture, expected) {
  return async () => {
    const { css } = await processor.process(fixture, { from: undefined });
    assert.strictEqual(css, expected);
  };
}

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
    'h1{background:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20xml%3Aspace%3D%22preserve%22%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%2250%22%20r%3D%2240%22%20fill%3D%22%23ff0%22%2F%3E%3C%2Fsvg%3E")}'
  )
);

test(
  'should optimise svg',
  processCss(
    `.box {
				background-image: url('data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201%201%22%20preserveAspectRatio%3D%22none%22%3E%3ClinearGradient%20id%3D%22gradient%22%20gradientUnits%3D%22userSpaceOnUse%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23414042%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23ffffff%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%221%22%20height%3D%221%22%20fill%3D%22url(%23gradient)%22%20%2F%3E%3C%2Fsvg%3E');
		}`,
    `.box{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20preserveAspectRatio%3D%22none%22%20viewBox%3D%220%200%201%201%22%3E%3ClinearGradient%20id%3D%22a%22%20x1%3D%220%25%22%20x2%3D%22100%25%22%20y1%3D%220%25%22%20y2%3D%220%25%22%20gradientUnits%3D%22userSpaceOnUse%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23414042%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23fff%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3Cpath%20fill%3D%22url(%23a)%22%20d%3D%22M0%200h1v1H0z%22%2F%3E%3C%2Fsvg%3E")}`
  )
);
