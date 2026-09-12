import { test } from 'node:test';
import plugin from '../src/index.js';
import { processCSSFactory } from '../../../util/testHelpers.js';

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
  'should support keyframes inside CSS style rules',
  processCSS(
    `.card {
  @keyframes pulse {
    0% { opacity: 0; }
  }
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`,
    `.card {
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`
  )
);

test(
  'should discard earlier root keyframes when overridden inside a style rule',
  processCSS(
    `@keyframes pulse {
  0% { opacity: 0; }
}
.card {
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`,
    `.card {
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`
  )
);

test(
  'should discard earlier style-rule keyframes when overridden at root',
  processCSS(
    `.card {
  @keyframes pulse {
    0% { opacity: 0; }
  }
}
@keyframes pulse {
  0% { opacity: 1; }
}`,
    `.card {
}
@keyframes pulse {
  0% { opacity: 1; }
}`
  )
);

test(
  'should discard earlier keyframes across distinct style rules',
  processCSS(
    `.card {
  @keyframes pulse {
    0% { opacity: 0; }
  }
}
.sidebar {
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`,
    `.card {
}
.sidebar {
  @keyframes pulse {
    0% { opacity: 1; }
  }
}`
  )
);

test(
  'should discard multiple preceding duplicates leaving only the trailing definition',
  processCSS(
    `@keyframes fade {
  0% { opacity: 0; }
}
.card {
  @keyframes fade {
    0% { opacity: 0.5; }
  }
}
@keyframes fade {
  0% { opacity: 1; }
}`,
    `.card {
}
@keyframes fade {
  0% { opacity: 1; }
}`
  )
);
