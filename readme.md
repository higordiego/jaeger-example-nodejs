## Jaeger

Jaeger é um software open source para rastreamento de transações entre serviços distribuídos. Ele é usado para monitorar e solucionar problemas em ambientes de microsserviços complexos.

Instalação do jaeger via docker run.

```shell
$  docker run -d --name jaeger \
  -e COLLECTOR_ZIPKIN_HTTP_PORT=9411 \
  -p 5775:5775/udp \
  -p 6831:6831/udp \
  -p 6832:6832/udp \
  -p 5778:5778 \
  -p 16686:16686 \
  -p 14268:14268 \
  -p 14250:14250 \
  -p 9411:9411 \
  jaegertracing/all-in-one:1.16
```

### Acesso

Para acesso a plataforma, após a execursão do comando acima, [cliquei aqui](http://localhost:16686/search).

## Dependências

Para uso do jaeger em [nodejs](https://nodejs.org/en), segue as dependências abaixo:

```json
{
  "jaeger-client": "^3.18.1",
  "opentracing": "^0.14.5"
}
```

Instalação pela [yarn](https://yarnpkg.com).

```shell
$ yarn add jaeger-client opentracing 
```

Instalação pela [npm](https://www.npmjs.com).

```shell
$ npm install jaeger-client opentracing  -S
```

## Aplicação de exemplo

Vou iniciar uma aplicação com o [axios](https://github.com/axios/axios) + [express](https://expressjs.com/pt-br/) o intuito é fazer o tracing da request de entrada e saída.

Pre-requisito para usar o exemplo da aplicação.

 - [Express](https://expressjs.com/pt-br/)
 - [Axios](https://github.com/axios/axios)


Instalação das novas dependências, segue abaixo:

Instalação pela [yarn](https://yarnpkg.com/).

```shell
$ yarn axios express
```

Instalação pela [npm](https://www.npmjs.com/).

```shell
$ npm i axios express -S
```

Exemplo da inicialização do config da tracing, segue abaixo:

Exemplo ```helper/index.js```

```js
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
```

Exemplo do arquivo de tracing, segue abaixo:

Exemplo ```helper/tracing.js```

```js
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
```


Exemplo o ```index.js``` para o config do express.

```js
const axios = require('axios')
const express = require('express')
const mung = require('express-mung')
const bodyParser = require('body-parser')

const { tracingMiddleWare } = require('./helper/tracing')

const app = express()
app.use(bodyParser.json())

app.use(tracingMiddleWare)


app.post('/posts', async (req, res) => {
    const post = req.body

    const response = await axios.post('https://jsonplaceholder.typicode.com/posts', post)

    res.status(response.status).json(response.data)
})

app.listen(3001, () => { console.log('Service 2 ouvindo na porta 3001') })
```

Exemplo de request para api, segue abaixo:


```shell
curl --location --request POST 'http://localhost:3001/posts' \
--header 'Content-Type: application/json' \
--data-raw '{
    "message": "mensagem"
}'
```



