import * as React from 'react';
import Head from 'react-helmet';
import postcss from 'postcss';
import {Controlled as CodeMirror} from 'react-codemirror2';

import metadata from '../../components/Metadata';
import cssnano from './cssnano';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material.css';

import styles from './index.css';
import ContentBlock from '../../components/ContentBlock';
import {page, wrapper} from '../Page/index.css';

if (typeof navigator !== 'undefined') {
    require('codemirror/mode/css/css');
}

const options = {
    mode: 'css',
    theme: 'material',
    lineNumbers: true,
};

class Playground extends React.Component {
    constructor () {
        super();
        this.state = {
            input: "/* Your CSS here */",
            output: "",
        };
    }

    onBeforeChange = (editor, data, value) => {
        this.setState({
            input: value,
        });
    }

    onChange = (editor, data, value) => {
        postcss([ cssnano ]).process(value).then(result => {
            this.setState({
                output: result.css || '/* nothing */',
            });
        });
    }
    
    render () {
        const title = 'Playground';

        const meta = metadata({
            title: title,
            url: this.props.location.pathname,
        });

        return (
            <div>
                <noscript>
                    <div className={page}>
                        <div className={wrapper}>
                            <ContentBlock className={styles.required}>
                                <h2>⚠ JavaScript Required</h2>
                                The playground requires JavaScript to be enabled in your browser in order to function.
                            </ContentBlock>
                        </div>
                    </div>
                </noscript>
                <div className={styles.playground}>
                    <Head
                        title={`${title} - cssnano`}
                        meta={ meta }
                    />
                    <CodeMirror
                        className={styles.input}
                        value={this.state.input}
                        options={options}
                        onChange={this.onChange}
                        onBeforeChange={this.onBeforeChange}
                    />
                    <CodeMirror
                        className={styles.output}
                        value={this.state.output}
                        options={options}
                    />
                </div>
            </div>
        );
    }
}

export default Playground;
