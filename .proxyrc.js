const { createProxyMiddleware } = require("http-proxy-middleware");
const serveStatic = require("serve-static");
const morgan = require("morgan")

module.exports = function (app) {
    app.use("/predictions_cached", serveStatic("predicted"));
    app.use(
        createProxyMiddleware("/predictions/ts_test", {
            "target": "http://127.0.01:8080/predictions/ts_test",
        })
    );
};