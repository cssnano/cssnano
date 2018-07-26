import * as React from 'react';
import midasFactory from 'react-midas';

const Midas = midasFactory();

const CssExample = ({children}) => (
    <div>
        <Midas>{children}</Midas>
    </div>
);

export default CssExample;
