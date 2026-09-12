import { suite, test } from 'node:test';
import { processCSSFactory } from '../../../util/testHelpers.js';
import plugin from '../src/index.js';

const { passthroughCSS, processCSS } = processCSSFactory(plugin);

suite('unified border reduction', () => {
  test(
    'does not reduce border declarations across a normal all reset',
    passthroughCSS(
      'a{border-top-width:1px;all:initial;border-top-style:solid;border-top-color:red}'
    )
  );

  test(
    'does not reduce border declarations across an important all reset',
    passthroughCSS(
      'a{border-top-width:1px!important;all:initial!important;border-top-style:solid!important;border-top-color:red!important}'
    )
  );

  test(
    'reduces one complete side plus unrelated leaves',
    processCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-bottom-width:2px}',
      'a{border-top:1px solid red;border-bottom-width:2px}'
    )
  );

  test(
    'reduces one complete component plus unrelated leaves',
    processCSS(
      'a{border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px;border-top-color:red}',
      'a{border-width:1px;border-top-color:red}'
    )
  );

  test(
    'reduces multiple independent side groups',
    processCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-bottom-width:2px;border-bottom-style:dashed;border-bottom-color:blue}',
      'a{border-top:1px solid red;border-bottom:2px dashed blue}'
    )
  );

  test(
    'reduces multiple independent component groups',
    processCSS(
      'a{border-top-width:1px;border-right-width:1px;border-bottom-width:1px;border-left-width:1px;border-top-style:solid;border-right-style:solid;border-bottom-style:solid;border-left-style:solid}',
      'a{border-style:solid;border-width:1px}'
    )
  );

  test(
    'chooses non-overlapping component group in crossing-group competition',
    processCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-right-color:red;border-bottom-color:red;border-left-color:red}',
      'a{border-top-width:1px;border-top-style:solid;border-color:red}'
    )
  );

  test(
    'keeps leaves whose partial side crosses a complete component group',
    passthroughCSS(
      'a{border-color:purple;border-top-width:2px;border-top-style:solid}'
    )
  );

  test(
    'deduplicates repeated declarations and inserts after final contributing declaration',
    processCSS(
      'a{border-top-width:1px;border-top-width:2px;border-top-style:solid;border-top-color:red}',
      'a{border-top:2px solid red}'
    )
  );

  test(
    'preserves interleaved comments around reduced declarations',
    processCSS(
      'a{/* c1 */border-top-width:1px;/* c2 */border-bottom-width:2px;/* c3 */border-top-style:solid;border-top-color:red;/* c4 */}',
      'a{/* c1 *//* c2 */border-bottom-width:2px;/* c3 */border-top:1px solid red;/* c4 */}'
    )
  );

  test(
    'reduces normal and !important lanes independently',
    processCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-bottom-width:2px!important;border-bottom-style:dashed!important;border-bottom-color:blue!important}',
      'a{border-top:1px solid red;border-bottom:2px dashed blue!important}'
    )
  );

  test(
    'blocks border reduction when border-image is present',
    passthroughCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-image:none}'
    )
  );

  test(
    'blocks border reduction when logical border properties are present',
    passthroughCSS(
      'a{border-top-width:1px;border-top-style:solid;border-top-color:red;border-inline-start:1px solid red}'
    )
  );

  test(
    'normalizes standalone border-spacing and preserves property case',
    processCSS('a{BORDER-SPACING:10px 10px}', 'a{BORDER-SPACING:10px}')
  );

  test(
    'preserves border-spacing value casing',
    processCSS('a{border-spacing:10PX 10PX}', 'a{border-spacing:10PX}')
  );

  test(
    'preserves multi-axis unequal border-spacing values',
    passthroughCSS('a{border-spacing:10px 20px}')
  );

  test(
    'preserves independent width and style when partial side uses rgba() fallback',
    passthroughCSS(
      'a{border-top-color:#ddd;border-top-color:rgba(0,0,0,.15);border-top-width:1px;border-top-style:solid}'
    )
  );

  test(
    'preserves independent style and color when partial side uses calc() fallback',
    passthroughCSS(
      'a{border-top-width:1px;border-top-width:calc(2px + 1px);border-top-style:solid;border-top-color:#ddd}'
    )
  );

  test(
    'normal border reset does not authorize important border shorthand in !important lane',
    processCSS(
      'a{border:1px solid red;border-top-width:2px!important;border-top-style:dashed!important;border-top-color:blue!important;border-right-width:2px!important;border-right-style:dashed!important;border-right-color:blue!important;border-bottom-width:2px!important;border-bottom-style:dashed!important;border-bottom-color:blue!important;border-left-width:2px!important;border-left-style:dashed!important;border-left-color:blue!important}',
      'a{border:1px solid red;border-color:blue!important;border-style:dashed!important;border-width:2px!important}'
    )
  );

  test(
    'important border reset does not authorize a normal-lane reset',
    processCSS(
      'a{border:1px solid red!important;border-top-width:2px;border-top-style:dashed;border-top-color:blue;border-right-width:2px;border-right-style:dashed;border-right-color:blue;border-bottom-width:2px;border-bottom-style:dashed;border-bottom-color:blue;border-left-width:2px;border-left-style:dashed;border-left-color:blue}',
      'a{border:1px solid red!important;border-color:blue;border-style:dashed;border-width:2px}'
    )
  );
});
