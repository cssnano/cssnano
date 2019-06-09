export default function uniqueExcept(exclude) {
  return function unique(list) {
    return list.filter((item, i) => {
      if (item.toLowerCase() === exclude) {
        return true;
      }
      return i === list.indexOf(item);
    });
  };
}
