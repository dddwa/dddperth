// Local rules shared by the standalone core and conference forks.
const guide = 'See core/docs/date-time.md (docs/date-time.md in standalone core).'

function property(node) {
    if (!node || node.type !== 'MemberExpression') return undefined
    return node.computed ? node.property.value : node.property.name
}

function variable(context, node) {
    if (node?.type !== 'Identifier') return undefined
    for (let scope = context.sourceCode.getScope(node); scope; scope = scope.upper) {
        const found = scope.set.get(node.name)
        if (found) return found
    }
}

function globalObject(context, node) {
    return node?.type === 'Identifier' && ['globalThis', 'window', 'self'].includes(node.name) &&
        !variable(context, node)?.defs.length
}

function globalDate(context, node) {
    return (node?.type === 'Identifier' && node.name === 'Date' && !variable(context, node)?.defs.length) ||
        (property(node) === 'Date' && globalObject(context, node.object))
}

// Resolve the binding, rather than spelling: handles import aliases and avoids
// reporting parameters/local variables which happen to be named DateTime.
function luxonDateTime(context, node) {
    if (node?.type === 'Identifier') {
        return variable(context, node)?.defs.some((def) =>
            def.type === 'ImportBinding' && def.parent.source.value === 'luxon' &&
            def.node.type === 'ImportSpecifier' && def.node.imported.name === 'DateTime')
    }
    if (property(node) === 'DateTime') {
        return variable(context, node.object)?.defs.some((def) =>
            def.type === 'ImportBinding' && def.parent.source.value === 'luxon' &&
            def.node.type === 'ImportNamespaceSpecifier')
    }
    return false
}

function temporalNamespace(context, node) {
    const supportedSource = (source) => source === 'temporal-polyfill' ||
        source.startsWith('temporal-polyfill/') || source === '@ddd/conference-config' || source.endsWith('/temporal')
    if (node?.type === 'Identifier') {
        const binding = variable(context, node)
        if (node.name === 'Temporal' && !binding?.defs.length) return true
        return binding?.defs.some((def) => def.type === 'ImportBinding' &&
            def.node.type === 'ImportSpecifier' && def.node.imported.name === 'Temporal' &&
            supportedSource(def.parent.source.value))
    }
    if (property(node) === 'Temporal') {
        if (globalObject(context, node.object)) return true
        return variable(context, node.object)?.defs.some((def) => def.type === 'ImportBinding' &&
            def.node.type === 'ImportNamespaceSpecifier' && supportedSource(def.parent.source.value))
    }
    return false
}

export default {
    rules: {
        'use-conference-date-time': {
            meta: {
                type: 'problem', schema: [],
                messages: { useHelper: `Use standard Temporal values from the configured conference date helpers. ${guide}` },
            },
            create(context) {
                return {
                    ImportDeclaration(node) {
                        if (node.source.value === 'luxon' || node.source.value === 'temporal-polyfill' ||
                            node.source.value.startsWith('temporal-polyfill/')) context.report({ node, messageId: 'useHelper' })
                    },
                    MemberExpression(node) {
                        if (((node.object.type === 'Identifier' && node.object.name === 'Temporal' &&
                            !variable(context, node.object)?.defs.length) ||
                            (property(node.object) === 'Temporal' && globalObject(context, node.object.object))) && property(node) !== 'Now') {
                            context.report({ node, messageId: 'useHelper' })
                        }
                    },
                }
            },
        },
        'no-temporal-coercion': {
            meta: {
                type: 'problem', schema: [],
                messages: { compare: `Use Temporal's compare(), equals(), until()/since(), or explicit epoch values; implicit Temporal coercion throws. ${guide}` },
            },
            create(context) {
                function isTemporal(node) {
                    const services = context.sourceCode.parserServices
                    if (!services?.program || !services.esTreeNodeToTSNodeMap) return false
                    const type = services.program.getTypeChecker().getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node))
                    return (type.isUnion() ? type.types : [type]).some((part) =>
                        part.getSymbol()?.declarations?.some((declaration) =>
                            /(?:temporal-spec|lib\..*temporal).*\.d\.ts$/.test(declaration.getSourceFile().fileName)))
                }
                return {
                    BinaryExpression(node) {
                        if (['<', '<=', '>', '>=', '+', '-', '*', '/', '%', '**', '==', '!=', '|', '&', '^', '<<', '>>', '>>>'].includes(node.operator) &&
                            (isTemporal(node.left) || isTemporal(node.right))) context.report({ node, messageId: 'compare' })
                    },
                    AssignmentExpression(node) {
                        if (['+=', '-=', '*=', '/=', '%=', '**=', '|=', '&=', '^=', '<<=', '>>=', '>>>='].includes(node.operator) &&
                            (isTemporal(node.left) || isTemporal(node.right))) context.report({ node, messageId: 'compare' })
                    },
                    UpdateExpression(node) {
                        if (isTemporal(node.argument)) context.report({ node, messageId: 'compare' })
                    },
                    UnaryExpression(node) {
                        if (['+', '-', '~'].includes(node.operator) && isTemporal(node.argument)) context.report({ node, messageId: 'compare' })
                    },
                }
            },
        },
        'use-date-time-provider': {
            meta: {
                type: 'problem', schema: [],
                messages: { useProvider: `Read conference time from the request DateTimeProvider; pass now into helpers. For operational time, add a narrow suppression explaining why the clock must be real. ${guide}` },
            },
            create(context) {
                return {
                    MemberExpression(node) {
                        if ((globalDate(context, node.object) && property(node) === 'now') ||
                            (luxonDateTime(context, node.object) && ['now', 'local', 'utc'].includes(property(node))) ||
                            (property(node) === 'Now' && temporalNamespace(context, node.object))) {
                            context.report({ node, messageId: 'useProvider' })
                        }
                    },
                    NewExpression(node) {
                        if (globalDate(context, node.callee) && node.arguments.length === 0) {
                            context.report({ node, messageId: 'useProvider' })
                        }
                    },
                    CallExpression(node) {
                        // Date() called as a function returns the current time even with arguments.
                        if (globalDate(context, node.callee)) context.report({ node, messageId: 'useProvider' })
                    },
                }
            },
        },
        'no-native-date-calendar': {
            meta: {
                type: 'problem', schema: [],
                messages: { useTemporal: `Use Temporal for calendar arithmetic and formatting so the host timezone cannot change the date. ${guide}` },
            },
            create(context) {
                const methods = new Set(['getDate', 'getDay', 'getFullYear', 'getMonth', 'getHours', 'getMinutes', 'getSeconds', 'setDate', 'setFullYear', 'setMonth', 'setHours', 'setMinutes', 'setSeconds', 'toLocaleDateString', 'toLocaleTimeString', 'toLocaleString', 'toDateString', 'toTimeString', 'getYear', 'setYear'])
                function isNativeDate(node) {
                    const services = context.sourceCode.parserServices
                    if (services?.program && services.esTreeNodeToTSNodeMap) {
                        const type = services.program.getTypeChecker().getTypeAtLocation(services.esTreeNodeToTSNodeMap.get(node))
                        const parts = type.isUnion() ? type.types : [type]
                        return parts.some((part) => part.getSymbol()?.name === 'Date')
                    }
                    if (node.type === 'NewExpression') return globalDate(context, node.callee)
                    return variable(context, node)?.defs.some((def) =>
                        def.node.type === 'VariableDeclarator' && def.node.init?.type === 'NewExpression' &&
                        globalDate(context, def.node.init.callee))
                }
                return {
                    NewExpression(node) {
                        // Numeric calendar components use the host timezone; epoch milliseconds are safe.
                        if (globalDate(context, node.callee) && node.arguments.length > 1) {
                            context.report({ node, messageId: 'useTemporal' })
                        }
                    },
                    CallExpression(node) {
                        const method = property(node.callee)
                        if (!methods.has(method)) return
                        if (!isNativeDate(node.callee.object)) return
                        if (method.startsWith('toLocale')) {
                            const options = node.arguments[1]
                            if (options?.type === 'ObjectExpression' && options.properties.some((p) =>
                                p.type === 'Property' && (p.key.name ?? p.key.value) === 'timeZone')) return
                        }
                        context.report({ node, messageId: 'useTemporal' })
                    },
                }
            },
        },
    },
}
