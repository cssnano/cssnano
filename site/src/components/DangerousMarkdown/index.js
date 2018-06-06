import React, {PropTypes} from 'react';
import remark from 'remark';
import remarkHtml from 'remark-html';

function toHtml (children) {
    const proc = remark().use(remarkHtml);
    return String(proc.processSync(children));
}

const DangerousMarkdown = ({children}) => (
    <div dangerouslySetInnerHTML={{
        __html: toHtml(children)
    }} />
);

DangerousMarkdown.propTypes = {
    children: PropTypes.string.isRequired,
};

export default DangerousMarkdown;
