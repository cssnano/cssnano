import React, { Component } from 'react';

import { ControlledEditor as Editor } from '@monaco-editor/react';
import { RingSpinner as Loader } from 'react-spinners-kit';

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
          editorDidMount={this.handleEditorDidMount}
          options={{ lineNumbers: 'on' }}
        />
      </div>
    );
  }
}

export default ConfigEditor;
