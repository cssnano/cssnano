import * as React from 'react';
import {withPhenomicApi, query} from '@phenomic/preset-react-app/lib/client';

import Page from '../Page';
import {wrapper} from '../Page/index.css';
import PageError from '../PageError';
import Guides from './Guides';

import styles from './index.css';
import NextButton from './NextButton';

const Guide = ({isLoading, page, pages, location}) => {
    if (page.error) {
        return <PageError />;
    }
    const node = page && page.node;
    const index = node && node.order;
    const list = pages && pages.node && pages.node.list;
    return (
        <div className={[wrapper, styles.container].join(' ')}>
            <div className={styles.article}>
                <Page isLoading={isLoading} { ...node} url={location.pathname} />
                <NextButton index={index} pages={list} />
            </div>
            <div className={styles.sidebar}>
                <Guides pages={list} />
            </div>
        </div>
    );
};


export default withPhenomicApi(Guide, props => ({
    page: query({
        path: "content/guides",
        id: props.params && props.params.splat || "",
    }),
    pages: query({
        path: "content/guides",
        sort: "order",
        order: "asc",
    }),
}));
