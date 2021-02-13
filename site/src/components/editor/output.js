import React, { Component } from 'react';
import Editor from '@monaco-editor/react';
import { RingSpinner as Loader } from './RingSpinner.js';

class OutputEditor extends Component {
  render() {
    return (
      <div>
        <Editor
          height="50rem"
          theme={this.props.theme}
          language={'css'}
          loading={<Loader />}
          value={this.props.output}
          editorDidMount={this.handleEditorDidMount}
          options={{ lineNumbers: 'on' }}
        />
      </div>
    );
  }
}

export default OutputEditor;
