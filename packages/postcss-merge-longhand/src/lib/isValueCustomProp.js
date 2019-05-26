const isValueCustomProp = (value) => value && !!~value.search(/var\s*\(\s*--/i);

export default isValueCustomProp;
