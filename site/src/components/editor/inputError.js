import React, { Component } from 'react';
import styles from './editor.module.css';

class InputError extends Component {
  render() {
    return (
      <div className={styles.inputError} data-theme={this.props.theme}>
        {this.props.error}
      </div>
    );
  }
}

export default InputError;
