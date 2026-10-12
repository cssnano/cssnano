import { test } from 'node:test';
import processCss from './_processCss.js';

test(
  'should optimise duration',
  processCss(
    `.short {
				animation-duration: 200ms;
		}

		.long {
				animation-duration: 2s;
		}

		.negative {
				animation-duration: -569ms;
		}`,
    `.short{animation-duration:.2s}.long{animation-duration:2s}.negative{animation-duration:-569ms}`
  )
);

test(
  'should optimise font face',
  processCss(
    `@font-face {
				font-family: Glyphicons Halflings;
				src: url(../fonts/bootstrap/glyphicons-halflings-regular.eot);
				src: url(../fonts/bootstrap/glyphicons-halflings-regular.eot?#iefix) format("embedded-opentype"),
						 url(../fonts/bootstrap/glyphicons-halflings-regular.woff2) format("woff2"),
						 url(../fonts/bootstrap/glyphicons-halflings-regular.woff) format("woff"),
						 url(../fonts/bootstrap/glyphicons-halflings-regular.ttf) format("truetype"),
						 url(../fonts/bootstrap/glyphicons-halflings-regular.svg#glyphicons_halflingsregular) format("svg")
		}

		.icon {
				font-family: Glyphicons Halflings;
		}`,
    `@font-face{font-family:Glyphicons Halflings;src:url(../fonts/bootstrap/glyphicons-halflings-regular.eot);src:url(../fonts/bootstrap/glyphicons-halflings-regular.eot?#iefix) format("embedded-opentype"),url(../fonts/bootstrap/glyphicons-halflings-regular.woff2) format("woff2"),url(../fonts/bootstrap/glyphicons-halflings-regular.woff) format("woff"),url(../fonts/bootstrap/glyphicons-halflings-regular.ttf) format("truetype"),url(../fonts/bootstrap/glyphicons-halflings-regular.svg#glyphicons_halflingsregular) format("svg")}.icon{font-family:Glyphicons Halflings}`
  )
);

test(
  'should optimise ie9 hack',
  processCss(
    `h1 {
				margin-top: 10px \\9;
		}`,
    `h1{margin-top:10px\\9}`
  )
);

test(
  'should optimise !important',
  processCss(
    `p {
				margin: 100px !important;
		}`,
    `p{margin:100px!important}`
  )
);

test(
  'should optimise margin longhand',
  processCss(
    `h1 {
				margin-top: 9px;
				margin-right: 10px;
				margin-bottom: 11px;
				margin-left: 12px;
		}`,
    `h1{margin:9px 10px 11px 12px}`
  )
);

test(
  'should optimise margin longhand (2)',
  processCss(
    `h1 {
				margin-top: 9px;
				margin-right: 10px;
				margin-bottom: 9px;
				margin-left: 10px;
		}`,
    `h1{margin:9px 10px}`
  )
);

test(
  'should optimise margin longhand (3)',
  processCss(
    `h1 {
				margin-top: 8px;
				margin-right: 12px !important;
				margin-bottom: 14px;
				margin-left: 10px !important;
		}`,
    `h1{margin-top:8px;margin-right:12px!important;margin-bottom:14px;margin-left:10px!important}`
  )
);

test(
  'should optimise margin shorthand',
  processCss(
    `h1 {
				/* No expected optimisation */
				margin: 10px 20px 30px 40px;
		}

		h2 {
				/* Expected to transform to 3 values */
				margin: 10px 20px 30px 20px;
		}

		h3 {
				/* Expected to transform to 2 values */
				margin: 10px 20px 10px 20px;
		}

		h4 {
				/* Expected to transform to 1 value */
				margin: 10px 10px 10px 10px;
		}`,
    `h1{margin:10px 20px 30px 40px}h2{margin:10px 20px 30px}h3{margin:10px 20px}h4{margin:10px}`
  )
);

test(
  'should optimise padding longhand',
  processCss(
    `div {
				padding-left: 1px;
				padding-bottom: 2px;
				padding-top: 3px;
				padding-right: 4px;
		}`,
    `div{padding:3px 4px 2px 1px}`
  )
);

test(
  'should preserve calc spaces',
  processCss(
    `div {
				width: calc(100vw / 2 - 6px + 0);
		}`,
    `div{width:calc(100vw / 2 - 6px + 0)}`
  )
);

test(
  'should reduce calc',
  processCss(
    `h1 {
				width: calc(3px * 2 - 1px);
		}`,
    `h1{width:calc(5px)}`
  )
);

test(
  'should remove leading zeroes from reduced calc values',
  processCss(`.box { margin: calc(-.5 * 1rem); }`, `.box{margin:calc(-.5rem)}`)
);

test(
  'should preserve strange property names',
  processCss(
    'a {--kendo-spacing-1\\.5: 12px; margin: var(--kendo-spacing-1\\.5);}',
    'a{--kendo-spacing-1\\.5:12px;margin:var(--kendo-spacing-1\\.5)}'
  )
);
