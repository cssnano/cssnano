import postcss from 'postcss';
import cssnano from '..';

test('should merge rules before longhand', () => {
  const css = `
  .foo {
    border-color: #cc1f1a;
  }

  .bar {
    border-bottom-width: 1px;
    border-style: solid;
    border-color: #cc1f1a;
  }
    `;

  return postcss([cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      expect(result.css).toBe(
        '.foo{border-color:#cc1f1a}.bar{border-bottom:1px;border-color:#cc1f1a;border-style:solid}'
      );
    });
});

test('should merge rules before longhand #2', () => {
  const css = `
.has-errors .input {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.has-errors .checkbox-label {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.has-errors .checkbox-inline {
  background-color: #fcebea;
  border-color: #cc1f1a;
}

.error-banner .field-errors.filled {
  width: 100%;
  padding: 1.5rem 1.5rem 1rem;
  background-color: #fcebea;
  border-bottom-width: 1px;
  border-style: solid;
  border-color: #cc1f1a;
}

.error-banner .field-errors.filled   .field-error {
  width: 100%;
  font-size: .875rem;
  color: #22292f;
  line-height: 1.5;
  margin-bottom: .5rem;
}
  `;

  return postcss([cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      expect(result.css).toBe(
        '.has-errors .checkbox-inline,.has-errors .checkbox-label,.has-errors .input{background-color:#fcebea;border-color:#cc1f1a}.error-banner .field-errors.filled{background-color:#fcebea;border-bottom:1px;border-color:#cc1f1a;border-style:solid;padding:1.5rem 1.5rem 1rem;width:100%}.error-banner .field-errors.filled .field-error{color:#22292f;font-size:.875rem;line-height:1.5;margin-bottom:.5rem;width:100%}'
      );
    });
});

test('should merge rules before longhand #3', () => {
  const css = `
.foo {
  border-color: #cc1f1a;
}

.bar {
  border-bottom: 1px;
  border-color: #cc1f1a;
}
    `;

  return postcss([cssnano])
    .process(css, { from: undefined })
    .then((result) => {
      expect(result.css).toBe(
        '.bar,.foo{border-color:#cc1f1a}.bar{border-bottom:1px}'
      );
    });
});
