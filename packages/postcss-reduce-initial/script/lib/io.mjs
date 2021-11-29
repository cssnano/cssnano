import { reduceInitial, validate } from './mdnCssProps.mjs';

export function handleError(error) {
  if (error) {
    throw error;
  }
}

export function toJSONString(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export function write(fileFunc, filePaths, data, key) {
  fileFunc(filePaths[key], toJSONString(data[key]), handleError);
  return data;
}

export async function generate(fetchFunc, fileFunc, filePaths, jsonURL) {
  return fetchFunc(jsonURL)
    .then((result) => result.json())
    .then(reduceInitial)
    .then(validate)
    .then((data) => write(fileFunc, filePaths, data, 'fromInitial'))
    .then((data) => write(fileFunc, filePaths, data, 'toInitial'));
}
