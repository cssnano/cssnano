import { test } from 'node:test';
import processCss from './_processCss.js';

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
				font-weight: 900;;;
				color: red;;
		}`,
    `div{font-weight:900;color:red}`
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
    `.two-gradients{background:linear-gradient(#fff,#999) no-repeat border-box,linear-gradient(#eee,#777) no-repeat border-box;background-size:98px 50px,18px 50px;background-position:0 0,98px 0;background-origin:padding-box,padding-box}`
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
    `h1{border-color:red;border-style:solid;border-width:1px}`
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
