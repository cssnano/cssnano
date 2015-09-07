'use strict';

import chalk from 'chalk';
import path from 'path';
import table from 'text-table';
import logSymbols from 'log-symbols';
import plur from 'plur';

let logFrom = fromValue => {
    if (!fromValue.indexOf('<')) {
        return fromValue;
    }
    return path.relative(process.cwd(), fromValue);
};

let hacksFound = messages => {
    let num = messages.length + plur(' hack', messages.length);
    return `\n\n  ${logSymbols.error}  ${num} found.\n`;
};

export default input => {
    let messages = input.messages;
    let source = input.source;

    if (!messages.length) {
        return `  ${logSymbols.success}  No hacks found.`;
    }

    return `${chalk.underline(logFrom(source))}\n` + table(messages.map(msg => {
        let parts = msg.text.split(': ');
        return [
            '',
            chalk.gray('line ' + msg.node.source.start.line),
            chalk.gray('col ' + msg.node.source.start.column),
            parts[0],
            chalk.red(parts[1])
        ];
    })) + hacksFound(messages);
};
