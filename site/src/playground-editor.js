import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  bracketMatching,
} from '@codemirror/language';
import { defaultKeymap } from '@codemirror/commands';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { css } from '@codemirror/lang-css';

export const playgroundSetup = [
  highlightSpecialChars(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  bracketMatching(),
  closeBrackets(),
  css(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap]),
];
