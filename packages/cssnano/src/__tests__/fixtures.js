'use strict';
const { test } = require('uvu');
const processCss = require('./_processCss');

test(
  'should keep spaces in background repeat',
  processCss(
    `h1 {
				background: url(image.png) no-repeat
		}`,
    `h1{background:url(image.png) no-repeat}`
  )
);

test(
  'should dedupe charset definitions',
  processCss(
    `@charset "utf-8";

		a {
				display: block;
		}

		@charset "utf-8";

		div {
				font-family: €42;
		}`,
    `@charset "utf-8";a{display:block}div{font-family:€42}`
  )
);

test(
  'should dedupe selectors',
  processCss(
    `h1, h2 {
				color: red;
		}

		h2, h1 {
				font-weight: 400;
		}`,
    `h1,h2{color:red;font-weight:400}`
  )
);

test(
  'should dedupe semicolons',
  processCss(
    `div {
				font-weight: 900;;;;
				color: red;;
		}`,
    `div{color:red;font-weight:900}`
  )
);

test(
  'should discard duplicate keyframes',
  processCss(
    `@keyframes fadeOut {
				0% {
						opacity: 1;
				}
				100% {
						opacity: 0;
				}
		}

		@keyframes fadeOut {
				0% {
						opacity: 1;
				}
				100% {
						opacity: 0;
				}
		}

		.fadeOut {
				animation-name: fadeOut;
		}`,
    `@keyframes fadeOut{0%{opacity:1}to{opacity:0}}.fadeOut{animation-name:fadeOut}`
  )
);

test(
  'should handle css variables',
  processCss(
    `.Button--action:hover:not(.is-disabled) {
				background-color: var(--wc-variant-background-light);
		}`,
    `.Button--action:hover:not(.is-disabled){background-color:var(--wc-variant-background-light)}`
  )
);

test(
  'should handle padding shorthand',
  processCss(
    `h1 {
				padding: 10px 20px 30px 40px;
		}

		h2 {
				padding: 10px 20px 30px;
		}

		h3 {
				padding: 10px 20px;
		}

		h4 {
				padding: 10px;
		}`,
    `h1{padding:10px 20px 30px 40px}h2{padding:10px 20px 30px}h3{padding:10px 20px}h4{padding:10px}`
  )
);

test(
  'should normalize urls',
  processCss(
    `body {
				background: url("http://somewebsite.com/assets/css/../images/test.jpg");
		}`,
    `body{background:url(http://somewebsite.com/assets/images/test.jpg)}`
  )
);

test(
  'should optimise gradient colour stops',
  processCss(
    `div {
				background-image: -webkit-linear-gradient(black, green, yellow);
		}`,
    `div{background-image:-webkit-linear-gradient(#000,green,#ff0)}`
  )
);

test(
  'should not mangle multiple gradients',
  processCss(
    `.two-gradients {
				background: linear-gradient(#fff, #999) no-repeat border-box, linear-gradient(#eee, #777) no-repeat border-box;
				background-size: 98px 50px, 18px 50px;
				background-position: 0 0, 98px 0;
				background-origin: padding-box, padding-box;
		}`,
    `.two-gradients{background:linear-gradient(#fff,#999) no-repeat border-box,linear-gradient(#eee,#777) no-repeat border-box;background-origin:padding-box,padding-box;background-position:0 0,98px 0;background-size:98px 50px,18px 50px}`
  )
);

test(
  'should optimise border longhand',
  processCss(
    `h1 {
				border-width: 1px 1px 1px 1px;
				border-color: red #f00 red #f00;
				border-style: solid solid solid solid;
		}`,
    `h1{border:1px solid red}`
  )
);

test(
  'should trim whitespace in border radius',
  processCss(
    `div {
				border-radius: 100% / 10%;
		}`,
    `div{border-radius:100%/10%}`
  )
);

test(
  'should trim whitespace in selector combinators',
  processCss(
    `p + p {
				font-style: italic;
		}

		h1 ~ p {
				font-size: 2em;
		}

		p > a {
				font-weight: 700;
		}`,
    `p+p{font-style:italic}h1~p{font-size:2em}p>a{font-weight:700}`
  )
);

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
    `h1{margin-bottom:14px;margin-left:10px!important;margin-right:12px!important;margin-top:8px}`
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
    `div{width:calc(50vw - 6px)}`
  )
);

test(
  'should reduce calc',
  processCss(
    `h1 {
				width: calc(3px * 2 - 1px);
		}`,
    `h1{width:5px}`
  )
);

test(
  'should optimise svg',
  processCss(
    `.box {
				background-image: url('data:image/svg+xml,%3C%3Fxml%20version%3D%221.0%22%20%3F%3E%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20viewBox%3D%220%200%201%201%22%20preserveAspectRatio%3D%22none%22%3E%3ClinearGradient%20id%3D%22gradient%22%20gradientUnits%3D%22userSpaceOnUse%22%20x1%3D%220%25%22%20y1%3D%220%25%22%20x2%3D%22100%25%22%20y2%3D%220%25%22%3E%3Cstop%20offset%3D%220%25%22%20stop-color%3D%22%23414042%22%2F%3E%3Cstop%20offset%3D%22100%25%22%20stop-color%3D%22%23ffffff%22%20stop-opacity%3D%220%22%2F%3E%3C%2FlinearGradient%3E%3Crect%20x%3D%220%22%20y%3D%220%22%20width%3D%221%22%20height%3D%221%22%20fill%3D%22url(%23gradient)%22%20%2F%3E%3C%2Fsvg%3E');
		}`,
    `.box{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1' preserveAspectRatio='none'%3E%3ClinearGradient id='a' gradientUnits='userSpaceOnUse' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' stop-color='%23414042'/%3E%3Cstop offset='100%25' stop-color='%23fff' stop-opacity='0'/%3E%3C/linearGradient%3E%3Cpath fill='url(%23a)' d='M0 0h1v1H0z'/%3E%3C/svg%3E")}`
  )
);

test(
  'should remove leading zeroes from reduced calc values',
  processCss(`.box { margin: calc(-.5 * 1rem); }`, `.box{margin:-.5rem}`)
);
test.run();
