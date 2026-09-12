import { test } from 'node:test';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { processCSS } = processCSSFactory(plugin);

test(
  'overridden @counter-style should be discarded correctly',
  processCSS(
    `@counter-style my-alpha {
  system: fixed;
  symbols: A B C;
  suffix: " ";
}

@COUNTER-STYLE my-alpha {
    system: fixed;
    symbols: A B C;
    suffix: " ";
}

@counter-style my-alpha {
  system: fixed;
  symbols: Ⓐ Ⓑ Ⓒ;
  suffix: " ";
}

@media (max-width: 400px) {
  @counter-style my-alpha {
    system: fixed;
    symbols: A B C;
    suffix: " ";
  }

  @supports (display: flex) {
    @counter-style my-alpha {
      system: fixed;
      symbols: a b c;
      suffix: " ";
    }
  }

  @counter-style my-alpha {
    system: fixed;
    symbols: Ⓐ Ⓑ Ⓒ;
    suffix: " ";
  }
}
`,
    `@counter-style my-alpha {
  system: fixed;
  symbols: Ⓐ Ⓑ Ⓒ;
  suffix: " ";
}

@media (max-width: 400px) {

  @supports (display: flex) {
    @counter-style my-alpha {
      system: fixed;
      symbols: a b c;
      suffix: " ";
    }
  }

  @counter-style my-alpha {
    system: fixed;
    symbols: Ⓐ Ⓑ Ⓒ;
    suffix: " ";
  }
}
`
  )
);

test(
  'should not override across distinct at-rule namespaces',
  processCSS(
    `@counter-style spin {
  system: cyclic;
  symbols: ⠋ ⠙ ⠹;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}`,
    `@counter-style spin {
  system: cyclic;
  symbols: ⠋ ⠙ ⠹;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}`
  )
);

test(
  'should support counter-style inside CSS style rules',
  processCSS(
    `.card {
  @counter-style count {
    system: cyclic;
    symbols: A;
  }
  @counter-style count {
    system: cyclic;
    symbols: B;
  }
}`,
    `.card {
  @counter-style count {
    system: cyclic;
    symbols: B;
  }
}`
  )
);
