import React, {PropTypes} from 'react';
import midas from 'midas';

const CssExample = ({css}) => (
    <div
        dangerouslySetInnerHTML={{
            __html: midas(css).content
        }}
    />
);

CssExample.propTypes = {
    css: PropTypes.string.isRequired,
};

export default CssExample;
