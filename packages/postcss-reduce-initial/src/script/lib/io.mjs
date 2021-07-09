import fetch from 'node-fetch';
import { reduceInitial } from './mdnCssProps.mjs';

export function validate(data) {
  if (
    data === undefined ||
    !Object.keys(data.fromInitial).length ||
    !Object.keys(data.toInitial).length
  ) {
    return Promise.reject(new Error('Fetching & processing JSON data failed!'));
  }
  return data;
}

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

export async function generate(jsonURL, fileFunc, filePaths) {
  return fetch(jsonURL)
    .then((result) => result.json())
    .then(reduceInitial)
    .then(validate)
    .then((data) => write(fileFunc, filePaths, data, 'fromInitial'))
    .then((data) => write(fileFunc, filePaths, data, 'toInitial'));
}
