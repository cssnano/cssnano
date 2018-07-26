import * as React from 'react';

import PagePreview from '../PagePreview';

import styles from './index.css';

const PagesList = ({pages}) => (
    <div>
        {pages && !pages.length && "No posts yet."}
        {pages && pages.length && <ul className={ styles.list }>
            {pages.map(page => (
                <li key={page.id}>
                    <PagePreview
                        { ...page } 
                        url={`/blog/${page.id}`}
                    />
                </li>
            ))}
        </ul>}
    </div>
);

export default PagesList;
