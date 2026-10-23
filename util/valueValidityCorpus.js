/**
 * Values the frameworks lack. Invalid inputs matter most: a stage must leave
 * them ignored.
 * @type {Record<string, string>}
 */
export const syntheticCorpus = {
  'postcss-minify-gradients': [
    'linear-gradient(to top, red, blue)',
    'linear-gradient(to bottom right, red, blue)',
    'linear-gradient(to top left, red, blue)',
    'linear-gradient(to nowhere, red, blue)',
    'linear-gradient(red 0%, blue 100%)',
    'linear-gradient(red 0px, blue 100%)',
    'linear-gradient(0deg, red 0%, blue 100%)',
    'linear-gradient(red, blue 100%)',
    'linear-gradient(red 0%, blue)',
    'linear-gradient(red, blue, 100%)',
    'linear-gradient(rgb(0 0 0 / 50%) 0%, blue 100%)',
    'repeating-linear-gradient(red 0%, blue 10px 100%)',
    '-webkit-linear-gradient(top, red 0%, blue 100%)',
    'radial-gradient(circle at center, red 0%, blue 100%)',
    'radial-gradient(circle at top left, red 0px, blue 100%)',
    'radial-gradient(red 0%, blue 100%)',
    'conic-gradient(from 0deg, red 0deg, blue 360deg)',
    'conic-gradient(red 0%, blue 100%)',
  ]
    .map((value) => `a{background-image:${value}}`)
    .join('\n'),
  'postcss-reduce-initial': [
    ['top', 'initial'],
    ['top', 'auto'],
    ['display', 'initial'],
    ['display', 'inline'],
    ['opacity', 'initial'],
    ['opacity', '1'],
    ['opacity', '1.0'],
    ['color', 'initial'],
    ['margin-left', 'initial'],
    ['margin-left', '0'],
    ['margin-left', '0px'],
    ['flex-direction', 'ROW'],
    ['unknown-property', 'initial'],
  ]
    .map(([prop, value]) => `a{${prop}:${value}}`)
    .join('\n'),
  'postcss-normalize-display-values': [
    'block flow',
    'block flow-root',
    'inline flow',
    'inline flow-root',
    'block flex',
    'inline flex',
    'inline grid',
    'inline table',
    'block flow list-item',
    'list-item block flow',
    'list-item inline flow',
    'list-item block flex',
    'block block',
    'flow flow',
    'block inline',
    'block foo',
    'run-in flow',
    'block ruby',
    'inline ruby',
  ]
    .map((value) => `a{display:${value}}`)
    .join('\n'),
  'postcss-normalize-repeat-style': [
    'repeat no-repeat',
    'no-repeat repeat',
    'repeat repeat',
    'space round',
    'repeat / no-repeat',
    'repeat no-repeat/cover',
    'repeat red no-repeat',
    'repeat 50% no-repeat',
    'repeat var(--x) no-repeat',
    'repeat/* c */no-repeat',
    'repeat no-repeat, space round',
    'repeat no-repeat, repeat-x',
    'repeat, no-repeat',
    'repeat repeat-x',
    'repeat no-repeat foo',
  ]
    .map((value) => `a{background-repeat:${value}}`)
    .join('\n'),
  'postcss-normalize-positions': [
    'left center',
    'center left',
    'top center',
    'center top',
    'right bottom',
    'bottom right',
    'left top',
    'top left',
    'left 10px',
    'left center / cover',
    'left center, top right',
    'center center',
    'left center top',
    'calc(10px) center',
    'var(--x) left',
    'left/* c */top',
    'left center foo',
    'top center center',
    'left\\ center',
    'left center left',
  ]
    .map((value) => `a{background-position:${value}}`)
    .join('\n'),
  'postcss-normalize-string': [
    "content:'x'",
    'content:"it\'s"',
    "content:'a\\\"b'",
    'font-family:\'Arial\', "Times"',
    "quotes:'\\201C' '\\201D'",
    "background:url('a.png')",
  ]
    .map((declaration) => `a{${declaration}}`)
    .join('\n'),
  'postcss-normalize-url': [
    "background:url('a.png')",
    'background:url( "a b.png" )',
    'src:url("font.woff2") format("woff2")',
    'mask:url(data:image/svg+xml;charset=utf8,%3Csvg%3E)',
    'cursor:url(a.cur), auto',
  ]
    .map((declaration) => `a{${declaration}}`)
    .join('\n'),
  'postcss-minify-font-values': [
    'font-family:"Arial", "Times New Roman", serif',
    'font-family:"Helvetica Neue" , sans-serif',
    'font-family:"sans-serif", Arial',
    'font:bold 12px/1.5 "Helvetica Neue", serif',
    'font:12px/* c */"Arial"',
    'font-weight:bold',
    'font-weight:var(--weight)',
    'font-family:var(--family), "Arial"',
  ]
    .map((declaration) => `a{${declaration}}`)
    .join('\n'),
  'postcss-normalize-unicode': [
    'U+0025-00FF',
    'u+4??',
    'U+0-7F, U+80-FF',
    'u+2b00-2bff, u+1e00-1eff',
    'U+1E00-1EFF, U+1EFF-1F00',
    'U+0000-FFFF, U+1F',
    'U+0?',
    'U+4E00-9FFF, U+3400-4DBF',
  ]
    .map((range) => `@font-face{unicode-range:${range}}`)
    .join('\n'),
  'postcss-ordered-values': [
    'border:solid 1px red',
    'border:red solid 1px',
    'outline:solid red 1px',
    'column-rule:solid 1px red',
    'columns:auto 2',
    'box-shadow:red 1px 1px 0 inset',
    'list-style:inside disc',
    'transition:opacity 1s ease-in',
    'animation:1s ease-in fade',
    'flex-flow:column wrap',
    'grid-row:span 2 / 3',
    'grid-column:header / footer',
    '-webkit-box-shadow:red 1px 1px',
    'border:solid calc(1px + 1px) red',
  ]
    .map((declaration) => `a{${declaration}}`)
    .join('\n'),
  'postcss-reduce-transforms': [
    'scale(1, 1)',
    'scale(2, 2)',
    'scale(2, 1)',
    'scale(1, 2)',
    'scale(1px, 1px)',
    'scale(1%, 1%)',
    'scale(1deg, 1)',
    'scale3d(1, 1, 2)',
    'scale3d(1, 1px, 2)',
    'translate(10px, 0)',
    'translate(0, 10px)',
    'translate(0, 0)',
    'translate(0deg, 10px)',
    'translate(10px, 0deg)',
    'translate(10px, 0foo)',
    'translate3d(0, 0, 10px)',
    'translate3d(0, 0%, 10px)',
    'translate3d(0deg, 0, 10px)',
    'rotate3d(1, 0, 0, 10deg)',
    'rotate3d(0, 1, 0, 10deg)',
    'rotate3d(1, 0, 0, 10)',
    'rotate3d(1px, 0, 0, 10deg)',
  ]
    .map((value) => `a{transform:${value}}`)
    .join('\n'),
  'postcss-normalize-timing-functions': [
    'cubic-bezier(0.25, 0.1, 0.25, 1)',
    'cubic-bezier(0, 0, 1, 1)',
    'cubic-bezier(0.42, 0, 1, 1)',
    'cubic-bezier(0, 0, 0.58, 1)',
    'cubic-bezier(0.42, 0, 0.58, 1)',
    'cubic-bezier(0.25, 0.1, 0.25)',
    'cubic-bezier(2, 0.1, 0.25, 1)',
    'steps(1, start)',
    'steps(1, end)',
    'steps(1, jump-start)',
    'steps(1)',
    'steps(2, end)',
    'steps(0)',
    'steps(1.5, end)',
    'steps(1, nope)',
  ]
    .map((value) => `a{transition-timing-function:${value}}`)
    .join('\n'),
  'postcss-calc': [
    'calc(1px + 2px)',
    'calc(100% - 10px)',
    'calc(2 * 3px)',
    'calc(1px * 2 + 3px)',
    'calc(1px / 0)',
    'calc(1px + var(--x))',
    'calc(1deg + 1rad)',
    'calc(10px * (1px + 1px))',
  ]
    .map((value) => `a{width:${value}}`)
    .join('\n'),
  'postcss-convert-values': [
    'a{width:96px;transition-duration:500ms;transform:rotate(1grad)}',
    'a{line-height:0px;flex-basis:0%;opacity:1.2}',
    'a{margin:0px 0.0px;font:12px/1.5 serif}',
    '@keyframes k{from{width:0px;opacity:1.2}to{width:0%}}',
    '@property --x{syntax:"<length>";initial-value:0px}',
    '@property --y{syntax:"<length-percentage>";initial-value:0%}',
    '@property --z{syntax:"<length>";initial-value:0%}',
  ].join('\n'),
};
