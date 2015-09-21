'use strict';

export default function plugin (targets, detect) {
    class Plugin {
        constructor (css, result) {
            this.nodes = [];
            this.css = css;
            this.result = result;
            this.targets = targets;
        }

        push (node, message) {
            node._stylehacks = message;
            this.nodes.push(node);
        }

        detect () {
            return detect.apply(this, arguments);
        }

        detectAndResolve () {
            this.detect();
            return this.resolve();
        }

        detectAndWarn () {
            this.detect();
            return this.warn();
        }

        resolve () {
            return this.nodes.forEach(node => node.remove());
        }

        warn () {
            return this.nodes.forEach(node => {
                return this.result.warn(node._stylehacks, {node: node});
            });
        }
    }

    return Plugin;
}
