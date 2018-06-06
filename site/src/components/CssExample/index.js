import React from "react"
import PropTypes from "prop-types"
import midasFactory from "react-midas"

const Midas = midasFactory();

const CssExample = ({children}) => (
    <div>
        <Midas>{children}</Midas>
    </div>
);

CssExample.propTypes = {
    children: PropTypes.string.isRequired,
};

export default CssExample;
