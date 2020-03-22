import * as React from 'react';
import { Link } from 'react-router';

const PagePreview = (props) => {
  const { url, title, date } = props;
  const pageDate = date ? new Date(date) : null;
  return (
    <div>
      <Link to={url}>{title}</Link>
      {pageDate && (
        <small>
          {' '}
          <time key={pageDate.toISOString()}>{pageDate.toDateString()}</time>
        </small>
      )}
    </div>
  );
};

export default PagePreview;
