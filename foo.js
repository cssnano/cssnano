const cssnano = require('./dist');

const css = `
.has-error .form-control{border-color:#a94442;box-shadow:inset 0 1px 1px rgba(0,0,0,.075)}
.has-error .form-control:focus{border-color:#843534;box-shadow:inset 0 1px 1px rgba(0,0,0,.075),0 0 6px #ce8483}
.has-error .input-group-addon{color:#a94442;background-color:#f2dede;border-color:#a94442}
`;

cssnano.process(css).then(result => {
    console.log(result.css);
}).catch(err => {
    console.warn(err.stack);
});
