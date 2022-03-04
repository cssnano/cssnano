import {
  keymap,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentOnInput } from '@codemirror/language';
import { defaultKeymap } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/matchbrackets';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/closebrackets';
import { defaultHighlightStyle } from '@codemirror/highlight';
import { css } from '@codemirror/lang-css';

export const playgroundSetup = [
  highlightSpecialChars(),
  drawSelection(),
  dropCursor(),
  EditorState.allowMultipleSelections.of(true),
  indentOnInput(),
  defaultHighlightStyle.fallback,
  bracketMatching(),
  closeBrackets(),
  css(),
  keymap.of([...closeBracketsKeymap, ...defaultKeymap]),
];
