import React, { Component } from 'react';

import Editor from '@monaco-editor/react';
import { RingSpinner as Loader } from './RingSpinner.js';

class ConfigEditor extends Component {
  render() {
    return (
      <div>
        <Editor
          height="50rem"
          theme={this.props.theme}
          language={'json'}
          loading={<Loader />}
          value={this.props.config}
          onChange={this.props.handleOnChange}
          options={{ lineNumbers: 'on' }}
        />
      </div>
    );
  }
}

export default ConfigEditor;
