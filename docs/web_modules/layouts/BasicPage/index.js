import React, {Component} from "react";
import Page from "../Page";
import {content} from '../Page/index.css';

export default class BasicPage extends Component {
    render () {
        return (
            <Page className={content} { ...this.props} />
        );
    }
}
