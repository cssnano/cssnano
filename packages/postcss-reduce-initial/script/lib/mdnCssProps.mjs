import { htmlToText } from 'html-to-text';

export const userAgentDependentFlag = [
  'dependsOnUserAgent',
  'noPracticalInitialValue',
  'noneButOverriddenInUserAgentCSS',
  'variesFromBrowserToBrowser',
  'invertOrCurrentColor',
  'startOrNamelessValueIfLTRRightIfRTL',
  'autoForSmartphoneBrowsersSupportingInflation',
];

export function isUserAgentDependent(initial) {
  return userAgentDependentFlag.includes(initial);
}

export function isComplexSyntax(initial, key) {
  return typeof initial !== 'string' || key === '--*';
}

export function isUnpredictable(status, key) {
  return status === 'nonstandard' || key === 'display';
}

export function toPlainText(value) {
  return htmlToText(value, {
    wordwrap: false,
  })
    .replace(/[\t\r\n\f\u200b]/g, '')
    .trim();
}

export function reduceInitial(propertyData) {
  return Object.keys(propertyData).reduce(
    (values, key) => {
      const { initial, status } = propertyData[key];
      if (
        !isUserAgentDependent(initial) &&
        !isComplexSyntax(initial, key) &&
        !isUnpredictable(status, key)
      ) {
        const value = toPlainText(initial);
        if (value.length < 'initial'.length) {
          values.fromInitial[key] = value;
        } else if (value.length > 'initial'.length) {
          values.toInitial[key] = value;
        }
      }
      return values;
    },
    { fromInitial: {}, toInitial: {} }
  );
}

export function validate(data) {
  if (
    data === undefined ||
    !Object.keys(data.fromInitial || {}).length ||
    !Object.keys(data.toInitial || {}).length
  ) {
    return Promise.reject(new Error('"Initial" data is missing or malformed'));
  }
  return Promise.resolve(data);
}
