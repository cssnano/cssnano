export default str => str.replace(/([^\d])0(\.\d*)/g, '$1$2');
