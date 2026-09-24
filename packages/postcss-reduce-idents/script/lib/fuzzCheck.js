import { rewrite, tokens, TokenType } from '../../src/lib/value.js';
import { counter } from '../../src/lib/slots.js';

const RENAME_TO = 'a';

/**
 * @typedef {{
 *   type: 'crash' | 'crash-retokenize' | 'flag-mismatch' | 'structure' |
 *         'spurious-edit' | 'not-idempotent',
 *   value: string,
 *   output?: string,
 *   message: string
 * }} FuzzFailure
 */

/**
 * Semantic oracle for one generated value: the rewrite may only change the
 * raw text of the idents its callback renames, and renaming the same value
 * again must change nothing.
 *
 * @param {import('./fuzzGenerate.js').FuzzCase} testCase
 * @return {FuzzFailure | undefined}
 */
export function check(testCase) {
  const { value } = testCase;
  let output;
  try {
    output = rewrite(
      value,
      (token, position) =>
        token[0] === TokenType.Ident && position === 'argument'
          ? RENAME_TO
          : undefined,
      counter.functions
    );
  } catch (err) {
    return {
      type: 'crash',
      value,
      message: `Crashed on rewrite: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // Restate each ident's position with a plain stack walk, so the machinery
  // is not its own oracle.
  const before = walkPositions(value);
  const after = walkPositions(output);

  const renamed = before.positions.some((position) => position === 'argument');
  if (!renamed && output !== value) {
    return {
      type: 'spurious-edit',
      value,
      output,
      message: 'Rewrote a value where no ident sat in an argument slot',
    };
  }

  if (before.tokens.length !== after.tokens.length) {
    return {
      type: 'structure',
      value,
      output,
      message: `Output has ${after.tokens.length} tokens, input had ${before.tokens.length}`,
    };
  }
  for (let i = 0; i < before.tokens.length; i++) {
    const [inputToken, outputToken] = [before.tokens[i], after.tokens[i]];
    if (inputToken[0] !== outputToken[0]) {
      return {
        type: 'structure',
        value,
        output,
        message: `Token ${i} changed kind from ${inputToken[0]} to ${outputToken[0]}`,
      };
    }
    if (inputToken[0] === TokenType.Ident) {
      const position = before.positions[before.idents.indexOf(inputToken)];
      if (position === 'argument' && outputToken[4].value !== RENAME_TO) {
        return {
          type: 'structure',
          value,
          output,
          message: `Argument ident ${JSON.stringify(inputToken[4].value)} did not rename to ${RENAME_TO}`,
        };
      }
      if (position !== 'argument' && outputToken[1] !== inputToken[1]) {
        return {
          type: 'structure',
          value,
          output,
          message: `Non-argument ident ${JSON.stringify(inputToken[1])} changed to ${JSON.stringify(outputToken[1])}`,
        };
      }
    } else if (inputToken[1] !== outputToken[1]) {
      return {
        type: 'structure',
        value,
        output,
        message: `Token ${i} raw text changed from ${JSON.stringify(inputToken[1])} to ${JSON.stringify(outputToken[1])}`,
      };
    }
  }

  // Expect a second pass to find nothing new: renaming preserves token kinds
  // and argument positions.
  if (after.positions.some((position) => position === 'argument')) {
    const secondPass = rewrite(
      output,
      (token, position) =>
        token[0] === TokenType.Ident && position === 'argument'
          ? RENAME_TO
          : undefined,
      counter.functions
    );
    if (secondPass !== output) {
      return {
        type: 'not-idempotent',
        value,
        output,
        message: 'Rewriting the output a second time changed it',
      };
    }
  }

  return undefined;
}

/**
 * An independent stack walk over the token stream: for each ident, where it
 * sits — an argument slot the counter function map names, a substituted
 * var()/env()/attr() value or other nested spot, or bare.
 *
 * @param {string} value
 * @return {{tokens: import('@csstools/css-tokenizer').CSSToken[], positions: string[], idents: import('@csstools/css-tokenizer').CSSToken[]}}
 */
function walkPositions(value) {
  const walked = tokens(value);
  /** @type {string[]} */
  const positions = [];
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  const idents = [];
  /** @type {{name: string | undefined, args: number[] | undefined, index: number, close: string}[]} */
  const stack = [];
  for (const token of walked) {
    const type = token[0];
    if (type === TokenType.Function) {
      const name = token[1].slice(0, -1).toLowerCase();
      stack.push({
        name,
        args: counter.functions.get(name),
        index: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenParen) {
      stack.push({
        name: undefined,
        args: undefined,
        index: 0,
        close: TokenType.CloseParen,
      });
    } else if (type === TokenType.OpenSquare) {
      stack.push({
        name: undefined,
        args: undefined,
        index: 0,
        close: TokenType.CloseSquare,
      });
    } else if (type === TokenType.OpenCurly) {
      stack.push({
        name: undefined,
        args: undefined,
        index: 0,
        close: TokenType.CloseCurly,
      });
    } else if (
      type === TokenType.CloseParen ||
      type === TokenType.CloseSquare ||
      type === TokenType.CloseCurly
    ) {
      stack.pop();
    } else if (type === TokenType.Comma && stack.length > 0) {
      stack[stack.length - 1].index++;
    } else if (type === TokenType.Ident) {
      const frame = stack[stack.length - 1];
      let position;
      if (
        stack.some(
          (open) =>
            open.name !== undefined &&
            (open.name === 'var' || open.name === 'env' || open.name === 'attr')
        )
      ) {
        position = 'nested';
      } else if (frame === undefined) {
        position = 'bare';
      } else if (frame.close === TokenType.CloseSquare) {
        position = 'bare';
      } else {
        position = frame.args?.includes(frame.index) ? 'argument' : 'nested';
      }
      positions.push(position);
      idents.push(token);
    }
  }
  return { tokens: walked, positions, idents };
}
