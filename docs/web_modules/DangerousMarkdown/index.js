import React, {PropTypes} from 'react';
import dangerousMd from '../../scripts/markdownRenderer.babel';

const DangerousMarkdown = ({children}) => (
    <div dangerouslySetInnerHTML={{
        __html: dangerousMd(children)
    }} />
);

DangerousMarkdown.propTypes = {
    children: PropTypes.string.isRequired,
};

export default DangerousMarkdown;
