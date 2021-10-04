const { initTracerFromEnv } = require("jaeger-client");

/**
 * @function
 * @param serviceName
 * @returns {*}
 */
exports.initTracer = (serviceName) => {
    const config = { serviceName: serviceName }
    config.sampler = { type: 'const', param: 1 }
    return initTracerFromEnv(config)
}
