// This file is to ensure open telemetry is configured before anything else

import sourceMapSupport from 'source-map-support'
import { configureOpenTelemetry } from './app/lib/setupOpenTelemetry.js'

sourceMapSupport.install()
configureOpenTelemetry()

import('./server.init.js')
    .then((server) => server.init())
    .catch((err) => {
        console.error('Error initializing server', err)
    })
