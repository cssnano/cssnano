// SOURCE : https://github.com/atom/autocomplete-css/blob/master/pseudo-selectors.json

const pseudoElementsList = {
  '::after': {
    description: 'Matches a virtual last child of the selected element.',
  },
  '::before': {
    description:
      'Creates a pseudo-element that is the first child of the element matched.',
  },
  '::first-letter': {
    description:
      'Matches the first letter of the first line of a block, if it is not preceded by any other content.',
  },
  '::first-line': {
    description: 'Applies styles only to the first line of an element.',
  },
  '::selection': {
    description:
      'Applies rules to the portion of a document that has been highlighted.',
  },
  ':active': {
    description: 'Matches when an element is being activated by the user.',
  },
  ':checked': {
    description:
      'Matches any radio input, checkbox input or option element that is checked or toggled to an on state.',
  },
  ':default': {
    description:
      'Matches any user interface element that is the default among a group of similar elements',
  },
  ':dir': {
    argument: 'direction',
    description:
      'Matches elements based on the directionality of the text contained in it.',
  },
  ':disabled': {
    description: 'Matches any disabled element.',
  },
  ':empty': {
    description: 'Matches any element that has no children at all.',
  },
  ':enabled': {
    description: 'Matches any enabled element.',
  },
  ':first': {
    description:
      'Describes the styling of the first page when printing a document.',
  },
  ':first-child': {
    description:
      'Matches any element that is the first child element of its parent.',
  },
  ':first-of-type': {
    description:
      'Matches the first sibling of its type in the list of children of its parent element.',
  },
  ':focus': {
    description: 'Matches an element that has focus.',
  },
  ':fullscreen': {
    description:
      "Applies to any element that's currently being displayed in full-screen mode.",
  },
  ':hover': {
    description:
      'Matches when the user designates an element with a pointing device, but does not necessarily activate it.',
  },
  ':indeterminate': {
    description:
      'Matches any checkbox input whose indeterminate DOM property is set to true by JavaScript.',
  },
  ':invalid': {
    description:
      "Matches any <input> or <form> element whose content fails to validate according to the input's type setting.",
  },
  ':lang': {
    argument: 'language',
    description:
      'Matches elements based on the language the element is determined to be in.',
  },
  ':last-child': {
    description:
      'Matches any element that is the last child element of its parent.',
  },
  ':last-of-type': {
    description:
      'Matches the last sibling with the given element name in the list of children of its parent element.',
  },
  ':left': {
    description: 'Matches any left page when printing a page.',
  },
  ':link': {
    description: 'Matches links inside elements.',
  },
  ':not': {
    argument: 'selector',
    description: 'Matches an element that is not represented by the argument.',
  },
  ':nth-child': {
    argument: 'an+b',
    description:
      'Matches an element that has an+b-1 siblings before it in the document tree.',
  },
  ':nth-last-child': {
    argument: 'an+b',
    description:
      'Matches an element that has an+b-1 siblings after it in the document tree.',
  },
  ':nth-last-of-type': {
    argument: 'an+b',
    description:
      'Matches an element that has an+b-1 siblings with the same element name after it in the document tree.',
  },
  ':nth-of-type': {
    argument: 'an+b',
    description:
      'Matches an element that has an+b-1 siblings with the same element name before it in the document tree',
  },
  ':only-child': {
    description: 'Matches any element which is the only child of its parent.',
  },
  ':only-of-type': {
    description: 'Matches any element that has no siblings of the given type.',
  },
  ':optional': {
    description:
      'Matches any <input> element that does not have the required attribute set on it.',
  },
  ':out-of-range': {
    description:
      'Matches when an element has its value attribute outside the specified range limitations for this element.',
  },
  ':read-only': {
    description: 'Matches when an element is not writable by the user.',
  },
  ':read-write': {
    description:
      'Matches when an element is editable by user like text input element.',
  },
  ':required': {
    description:
      'Matches any <input> element that has the required attribute set on it.',
  },
  ':right': {
    description:
      'Matches any right page when printing a page. It allows to describe the styling of right-side page.',
  },
  ':root': {
    description:
      'Matches the root element of a tree representing the document.',
  },
  ':scope': {
    description:
      'Matches the elements that are a reference point for selectors to match against.',
  },
  ':target': {
    description:
      'Matches the unique element, if any, with an id matching the fragment identifier of the URI of the document.',
  },
  ':valid': {
    description:
      "Matches any <input> or <form> element whose content validates correctly according to the input's type setting",
  },
  ':visited': {
    description: 'Matches links that have been visited.',
  },
};

export default pseudoElementsList;
