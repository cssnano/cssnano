const userAgentDependentFlag = new Set([
  'dependsOnUserAgent',
  'noPracticalInitialValue',
  'noneButOverriddenInUserAgentCSS',
  'variesFromBrowserToBrowser',
  'invertOrCurrentColor',
  'startOrNamelessValueIfLTRRightIfRTL',
  'autoForSmartphoneBrowsersSupportingInflation',
]);

export function isComplexSyntax(initial, key) {
  return typeof initial !== 'string' || key === '--*';
}

export function isUnpredictable(status, key) {
  return status === 'nonstandard' || key === 'display';
}

export function reduceInitial(propertyData) {
  const propertyMapping = { fromInitial: {}, toInitial: {} };
  for (const [key, { initial, status }] of Object.entries(propertyData)) {
    if (
      !userAgentDependentFlag.has(initial) &&
      !isComplexSyntax(initial, key) &&
      !isUnpredictable(status, key)
    ) {
      const value = initial.replace(/[\t\r\n\f\u200b]/g, '').trim();
      if (value.length < 'initial'.length) {
        propertyMapping.fromInitial[key] = value;
      } else if (value.length > 'initial'.length) {
        propertyMapping.toInitial[key] = value;
      }
    }
  }
  return propertyMapping;
}

export function validate(data) {
  return (
    data !== undefined &&
    Object.keys(data.fromInitial || {}).length &&
    Object.keys(data.toInitial || {}).length
  );
}
