import React, {Component, PropTypes} from "react";
import enhanceCollection from "phenomic/lib/enhance-collection";

import Page from "../Page";
import PagesList from "../../PagesList";
import {content} from '../Page/index.css';

const latestCount = 6;

export default class Blog extends Component {
    static contextTypes = {
        collection: PropTypes.array.isRequired,
    }

    render () {
        const latestPosts = enhanceCollection(this.context.collection, {
            filter: {layout: "Post"},
            sort: "date",
            reverse: true,
        })
        .slice(0, latestCount);

        return (
            <Page className={content} { ...this.props}>
                <PagesList pages={ latestPosts } />
            </Page>
        );
    }
}
