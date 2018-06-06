import enhanceCollection from "phenomic/lib/enhance-collection"

export default function guidesFilter (collection) {
    return enhanceCollection(collection, {
      filter: ({__url}) => !__url.indexOf('/guides/'),
      sort: (a, b) => a.order - b.order,
  });
}
