module.exports = {
    plugins: [
        // require("stylelint")(),
        require("postcss-preset-env")({
            stage: 0,
            features: {
                'custom-properties': {
                    preserve: false,     
                    variables: {
                        brandColor: "#40b97b",
                        brandColorComplement: "#ba5240",
                        /* phenomic defaults */
                        maxWidth: "60rem",
                        colorPrimaryDark: "#107491",
                        colorPrimary: "#007acc",
                        colorSecondaryDark: "#22846C",
                        colorSecondary: "#46BE77",
                        colorNeutralDark: "#111",
                        colorNeutral: "#8C8D91",
                        colorNeutralLight: "#FBFCFC",
                        colorText: "#555",
                    },
                },
            },
        }),
        // require("postcss-reporter")(),
        // ...!config.production ? [
        //   require("postcss-browser-reporter")(),
        // ] : [],
    ],
};
