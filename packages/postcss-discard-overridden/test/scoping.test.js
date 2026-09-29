import { test } from 'node:test';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'should discard duplicate keyframes across separate @media blocks with identical queries',
  processCSS(
    `@media (max-width: 500px) {
  @keyframes a {
    0% { opacity: 0; }
  }
}
@media (max-width: 500px) {
  @keyframes a {
    0% { opacity: 1; }
  }
}`,
    `@media (max-width: 500px) {
}
@media (max-width: 500px) {
  @keyframes a {
    0% { opacity: 1; }
  }
}`
  )
);

test(
  'should preserve keyframes across container queries and root',
  processCSS(
    `@keyframes spin {
  to { transform: rotate(180deg); }
}
@container (min-width: 500px) {
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}`,
    `@keyframes spin {
  to { transform: rotate(180deg); }
}
@container (min-width: 500px) {
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
}`
  )
);

test(
  'should discard duplicate keyframes across separate container query blocks with identical queries',
  processCSS(
    `@container (min-width: 500px) {
  @keyframes spin {
    0% { opacity: 0; }
  }
}
@container (min-width: 500px) {
  @keyframes spin {
    0% { opacity: 1; }
  }
}`,
    `@container (min-width: 500px) {
}
@container (min-width: 500px) {
  @keyframes spin {
    0% { opacity: 1; }
  }
}`
  )
);

test(
  'should preserve keyframes across cascade layers and unlayered rules',
  processCSS(
    `@keyframes anim {
  from { opacity: 0; }
}
@layer base {
  @keyframes anim {
    from { opacity: 1; }
  }
}`,
    `@keyframes anim {
  from { opacity: 0; }
}
@layer base {
  @keyframes anim {
    from { opacity: 1; }
  }
}`
  )
);

test(
  'should discard duplicate keyframes within the same cascade layer',
  processCSS(
    `@layer base {
  @keyframes anim {
    from { opacity: 0; }
  }
}
@layer base {
  @keyframes anim {
    from { opacity: 1; }
  }
}`,
    `@layer base {
}
@layer base {
  @keyframes anim {
    from { opacity: 1; }
  }
}`
  )
);
