import React, { Component } from 'react';
import { ControlledEditor as Editor } from '@monaco-editor/react';
import { RingSpinner as Loader } from 'react-spinners-kit';

class MainEditor extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isEditorReady: false,
    };
    this.handleEditorDidMount = this.handleEditorDidMount.bind(this);
  }

  handleEditorDidMount() {
    this.setState({ isEditorReady: true });
  }
  render() {
    return (
      <div>
        <Editor
          height="50rem"
          theme={this.props.theme}
          language={'css'}
          loading={<Loader />}
          value={this.props.input}
          onChange={this.props.handleOnChange}
          editorDidMount={this.handleEditorDidMount}
          options={{ lineNumbers: 'on' }}
        />
      </div>
    );
  }
}

export default MainEditor;
