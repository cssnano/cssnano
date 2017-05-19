import React from "react"
import PropTypes from "prop-types"
import styles from "./index.css"

const Hero = ({children}) => (
    <div className={styles.hero}>
        {children}
    </div>
);

Hero.propTypes = {
    children: PropTypes.string.isRequired,
};

export default Hero;
