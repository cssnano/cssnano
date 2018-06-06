import React, {Component} from "react";
import PropTypes from "prop-types";
import enhanceCollection from "phenomic/lib/enhance-collection";

import Page from "../Page";
import PagesList from "../../components/PagesList";

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

        return (
            <Page { ...this.props}>
                <PagesList pages={ latestPosts } />
            </Page>
        );
    }
}
