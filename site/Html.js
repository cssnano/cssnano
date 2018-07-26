import * as React from 'react';
import Head from 'react-helmet';

export default ({App, render}) => {
    // if needed, you can know if you are in development or in static rendering
    // const isDev = process.env.PHENOMIC_ENV === "development"
    const {Main, State, Script, Style} = render(<App />);
    const helmet = Head.renderStatic();
    return (
        <html {...helmet.htmlAttributes.toComponent()}>
            <head>
                {helmet.meta.toComponent()}
                {helmet.title.toComponent()}
                {helmet.base.toComponent()}
                <Style />
                {helmet.link.toComponent()}
                {helmet.style.toComponent()}
                {helmet.script.toComponent()}
                {helmet.noscript.toComponent()}
            </head>
            <body {...helmet.bodyAttributes.toComponent()}>
                <Main />
                <State />
                <Script />
            </body>
        </html>
    );
};
