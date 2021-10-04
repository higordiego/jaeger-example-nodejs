const opentracing = require('opentracing')
const { initTracer } = require('./index')
const tracer = initTracer('redfox-tracing')

opentracing.initGlobalTracer(tracer)


/**
 * @function
 * @param req
 * @param res
 * @param next
 */
exports.tracingMiddleWare = (req, res, next) => {
    const tracer = opentracing.globalTracer();
    const wireCtx = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers)
    const span = tracer.startSpan(req.path, { childOf: wireCtx })
    span.log({ event: 'request_received' })

    span.setTag(opentracing.Tags.HTTP_METHOD, req.method)
    span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER)
    span.setTag(opentracing.Tags.HTTP_URL, req.path)

    const responseHeaders = {}
    tracer.inject(span, opentracing.FORMAT_HTTP_HEADERS, responseHeaders)
    res.set(responseHeaders)

    Object.assign(req, { span })

    const finishSpan = () => {
        if (res.statusCode >= 500) {
            span.setTag(opentracing.Tags.SAMPLING_PRIORITY, 1)
            span.setTag(opentracing.Tags.ERROR, true)
            span.log({ event: 'error', message: res.statusMessage })
            span.log({ event: 'error', message: { request: JSON.stringify({ body: req.body }, null, 4) } })
        }

        span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode)
        span.log({ event: 'request_end' })
        span.finish()
    }
    res.on('finish', finishSpan)
    next()
}