import React from "react"
import PropTypes from "prop-types"
import { Link } from "phenomic"
import guidesCollection from "../../collections/guides"

import styles from "./index.css"

function formatGuide ({__url, title}, index) {
    return (
        <li key={`guide__${index}`}>
            <Link
                to={__url}
                className={styles.link}
                activeClassName={styles.active}
            >
                {title}
            </Link>
        </li>
    )
}

formatGuide.propTypes = {
    __url: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
};

const Guides = (props, { collection }) => {
  const guides = guidesCollection(collection)

  return (
    <ul className={styles.guides}>{ guides.map(formatGuide) }</ul>
  )
}

Guides.propTypes = {
  numberOfPosts: PropTypes.number,
}

Guides.contextTypes = {
  collection: PropTypes.array.isRequired,
}

export default Guides
