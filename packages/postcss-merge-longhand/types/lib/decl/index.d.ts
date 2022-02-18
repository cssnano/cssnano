declare const _exports: {
    [n: number]: typeof borders;
    length: number;
    toString(): string;
    toLocaleString(): string;
    pop(): typeof borders | undefined;
    push(...items: (typeof borders)[]): number;
    concat(...items: ConcatArray<typeof borders>[]): (typeof borders)[];
    concat(...items: (typeof borders | ConcatArray<typeof borders>)[]): (typeof borders)[];
    join(separator?: string | undefined): string;
    reverse(): (typeof borders)[];
    shift(): typeof borders | undefined;
    slice(start?: number | undefined, end?: number | undefined): (typeof borders)[];
    sort(compareFn?: ((a: typeof borders, b: typeof borders) => number) | undefined): (typeof borders)[];
    splice(start: number, deleteCount?: number | undefined): (typeof borders)[];
    splice(start: number, deleteCount: number, ...items: (typeof borders)[]): (typeof borders)[];
    unshift(...items: (typeof borders)[]): number;
    indexOf(searchElement: typeof borders, fromIndex?: number | undefined): number;
    lastIndexOf(searchElement: typeof borders, fromIndex?: number | undefined): number;
    every<S extends typeof borders>(predicate: (value: typeof borders, index: number, array: (typeof borders)[]) => value is S, thisArg?: any): this is S[];
    every(predicate: (value: typeof borders, index: number, array: (typeof borders)[]) => unknown, thisArg?: any): boolean;
    some(predicate: (value: typeof borders, index: number, array: (typeof borders)[]) => unknown, thisArg?: any): boolean;
    forEach(callbackfn: (value: typeof borders, index: number, array: (typeof borders)[]) => void, thisArg?: any): void;
    map<U>(callbackfn: (value: typeof borders, index: number, array: (typeof borders)[]) => U, thisArg?: any): U[];
    filter<S_1 extends typeof borders>(predicate: (value: typeof borders, index: number, array: (typeof borders)[]) => value is S_1, thisArg?: any): S_1[];
    filter(predicate: (value: typeof borders, index: number, array: (typeof borders)[]) => unknown, thisArg?: any): (typeof borders)[];
    reduce(callbackfn: (previousValue: typeof borders, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => typeof borders): typeof borders;
    reduce(callbackfn: (previousValue: typeof borders, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => typeof borders, initialValue: typeof borders): typeof borders;
    reduce<U_1>(callbackfn: (previousValue: U_1, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => U_1, initialValue: U_1): U_1;
    reduceRight(callbackfn: (previousValue: typeof borders, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => typeof borders): typeof borders;
    reduceRight(callbackfn: (previousValue: typeof borders, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => typeof borders, initialValue: typeof borders): typeof borders;
    reduceRight<U_2>(callbackfn: (previousValue: U_2, currentValue: typeof borders, currentIndex: number, array: (typeof borders)[]) => U_2, initialValue: U_2): U_2;
    find<S_2 extends typeof borders>(predicate: (this: void, value: typeof borders, index: number, obj: (typeof borders)[]) => value is S_2, thisArg?: any): S_2 | undefined;
    find(predicate: (value: typeof borders, index: number, obj: (typeof borders)[]) => unknown, thisArg?: any): typeof borders | undefined;
    findIndex(predicate: (value: typeof borders, index: number, obj: (typeof borders)[]) => unknown, thisArg?: any): number;
    fill(value: typeof borders, start?: number | undefined, end?: number | undefined): (typeof borders)[];
    copyWithin(target: number, start: number, end?: number | undefined): (typeof borders)[];
    entries(): IterableIterator<[number, typeof borders]>;
    keys(): IterableIterator<number>;
    values(): IterableIterator<typeof borders>;
    includes(searchElement: typeof borders, fromIndex?: number | undefined): boolean;
    [Symbol.iterator](): IterableIterator<typeof borders>;
    [Symbol.unscopables](): {
        copyWithin: boolean;
        entries: boolean;
        fill: boolean;
        find: boolean;
        findIndex: boolean;
        keys: boolean;
        values: boolean;
    };
};
export = _exports;
