import nodetest from 'node:test';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

const { test } = nodetest;
const { processCSS } = processCSSFactory(plugin);

test(
  'overridden @keyframes should be discarded correctly',
  processCSS(
    `@-webkit-keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 0.8;
  }
}
@-WEBKIT-KEYFRAMES fade-in {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 0.8;
    }
}
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 0.8;
  }
}
@KEYFRAMES fade-in {
    0% {
        opacity: 0;
    }
    100% {
        opacity: 0.8;
    }
}
@media (max-width: 500px) {
  @-webkit-keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }
  @-webkit-keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 0.8;
    }
  }
  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 0.8;
    }
  }
  @supports (display: flex) {
    @-webkit-keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
    @keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  }
}
@-webkit-keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
`,
    `@media (max-width: 500px) {
  @-webkit-keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 0.8;
    }
  }
  @keyframes fade-in {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 0.8;
    }
  }
  @supports (display: flex) {
    @-webkit-keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
    @keyframes fade-in {
      0% {
        opacity: 0;
      }
      100% {
        opacity: 1;
      }
    }
  }
}
@-webkit-keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
@keyframes fade-in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
`
  )
);

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
