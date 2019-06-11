
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (const k in src) tar[k] = src[k];
		return tar;
	}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function validate_store(store, name) {
		if (!store || typeof store.subscribe !== 'function') {
			throw new Error(`'${name}' is not a store with a 'subscribe' method`);
		}
	}

	function subscribe(component, store, callback) {
		const unsub = store.subscribe(callback);

		component.$$.on_destroy.push(unsub.unsubscribe
			? () => unsub.unsubscribe()
			: unsub);
	}

	function create_slot(definition, ctx, fn) {
		if (definition) {
			const slot_ctx = get_slot_context(definition, ctx, fn);
			return definition[0](slot_ctx);
		}
	}

	function get_slot_context(definition, ctx, fn) {
		return definition[1]
			? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
			: ctx.$$scope.ctx;
	}

	function get_slot_changes(definition, ctx, changed, fn) {
		return definition[1]
			? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
			: ctx.$$scope.changed || {};
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor || null);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function prevent_default(fn) {
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	function get_current_component() {
		if (!current_component) throw new Error(`Function called outside component initialization`);
		return current_component;
	}

	function onMount(fn) {
		get_current_component().$$.on_mount.push(fn);
	}

	function onDestroy(fn) {
		get_current_component().$$.on_destroy.push(fn);
	}

	function setContext(key, context) {
		get_current_component().$$.context.set(key, context);
	}

	function getContext(key) {
		return get_current_component().$$.context.get(key);
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = blank_object();
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var cjs = createCommonjsModule(function (module, exports) {

	Object.defineProperty(exports, '__esModule', { value: true });

	var makeOptions = function (opts) {
	    if (opts === void 0) { opts = {}; }
	    return ({
	        arrayFormat: opts.arrayFormat || 'none',
	        booleanFormat: opts.booleanFormat || 'none',
	        nullFormat: opts.nullFormat || 'default'
	    });
	};
	var encodeValue = function (value) { return encodeURIComponent(value); };
	var decodeValue = function (value) { return decodeURIComponent(value); };
	var encodeBoolean = function (name, value, opts) {
	    if (opts.booleanFormat === 'empty-true' && value) {
	        return name;
	    }
	    var encodedValue;
	    if (opts.booleanFormat === 'unicode') {
	        encodedValue = value ? '✓' : '✗';
	    }
	    else {
	        encodedValue = value.toString();
	    }
	    return name + "=" + encodedValue;
	};
	var encodeNull = function (name, opts) {
	    if (opts.nullFormat === 'hidden') {
	        return '';
	    }
	    if (opts.nullFormat === 'string') {
	        return name + "=null";
	    }
	    return name;
	};
	var getNameEncoder = function (opts) {
	    if (opts.arrayFormat === 'index') {
	        return function (name, index) { return name + "[" + index + "]"; };
	    }
	    if (opts.arrayFormat === 'brackets') {
	        return function (name) { return name + "[]"; };
	    }
	    return function (name) { return name; };
	};
	var encodeArray = function (name, arr, opts) {
	    var encodeName = getNameEncoder(opts);
	    return arr
	        .map(function (val, index) { return encodeName(name, index) + "=" + encodeValue(val); })
	        .join('&');
	};
	var encode = function (name, value, opts) {
	    if (value === null) {
	        return encodeNull(name, opts);
	    }
	    if (typeof value === 'boolean') {
	        return encodeBoolean(name, value, opts);
	    }
	    if (Array.isArray(value)) {
	        return encodeArray(name, value, opts);
	    }
	    return name + "=" + encodeValue(value);
	};
	var decode = function (value, opts) {
	    if (value === undefined) {
	        return opts.booleanFormat === 'empty-true' ? true : null;
	    }
	    if (opts.booleanFormat === 'string') {
	        if (value === 'true') {
	            return true;
	        }
	        if (value === 'false') {
	            return false;
	        }
	    }
	    else if (opts.booleanFormat === 'unicode') {
	        if (decodeValue(value) === '✓') {
	            return true;
	        }
	        if (decodeValue(value) === '✗') {
	            return false;
	        }
	    }
	    else if (opts.nullFormat === 'string') {
	        if (value === 'null') {
	            return null;
	        }
	    }
	    return decodeValue(value);
	};

	var getSearch = function (path) {
	    var pos = path.indexOf('?');
	    if (pos === -1) {
	        return path;
	    }
	    return path.slice(pos + 1);
	};
	var isSerialisable = function (val) { return val !== undefined; };
	var parseName = function (name) {
	    var bracketPosition = name.indexOf('[');
	    var hasBrackets = bracketPosition !== -1;
	    return {
	        hasBrackets: hasBrackets,
	        name: hasBrackets ? name.slice(0, bracketPosition) : name
	    };
	};

	/**
	 * Parse a querystring and return an object of parameters
	 */
	var parse = function (path, opts) {
	    var options = makeOptions(opts);
	    return getSearch(path)
	        .split('&')
	        .reduce(function (params, param) {
	        var _a = param.split('='), rawName = _a[0], value = _a[1];
	        var _b = parseName(rawName), hasBrackets = _b.hasBrackets, name = _b.name;
	        var currentValue = params[name];
	        var decodedValue = decode(value, options);
	        if (currentValue === undefined) {
	            params[name] = hasBrackets ? [decodedValue] : decodedValue;
	        }
	        else {
	            params[name] = [].concat(currentValue, decodedValue);
	        }
	        return params;
	    }, {});
	};
	/**
	 * Build a querystring from an object of parameters
	 */
	var build = function (params, opts) {
	    var options = makeOptions(opts);
	    return Object.keys(params)
	        .filter(function (paramName) { return isSerialisable(params[paramName]); })
	        .map(function (paramName) { return encode(paramName, params[paramName], options); })
	        .filter(Boolean)
	        .join('&');
	};
	/**
	 * Remove a list of parameters from a querystring
	 */
	var omit = function (path, paramsToOmit, opts) {
	    var options = makeOptions(opts);
	    var searchPart = getSearch(path);
	    if (searchPart === '') {
	        return {
	            querystring: '',
	            removedParams: {}
	        };
	    }
	    var _a = path.split('&').reduce(function (_a, chunk) {
	        var left = _a[0], right = _a[1];
	        var rawName = chunk.split('=')[0];
	        var name = parseName(rawName).name;
	        return paramsToOmit.indexOf(name) === -1
	            ? [left.concat(chunk), right]
	            : [left, right.concat(chunk)];
	    }, [[], []]), kept = _a[0], removed = _a[1];
	    return {
	        querystring: kept.join('&'),
	        removedParams: parse(removed.join('&'), options)
	    };
	};
	/**
	 * Remove a list of parameters from a querystring
	 */
	var keep = function (path, paramsToKeep, opts) {
	    var options = makeOptions(opts);
	    var searchPart = getSearch(path);
	    if (searchPart === '') {
	        return {
	            keptParams: {},
	            querystring: ''
	        };
	    }
	    var _a = path.split('&').reduce(function (_a, chunk) {
	        var left = _a[0], right = _a[1];
	        var rawName = chunk.split('=')[0];
	        var name = parseName(rawName).name;
	        return paramsToKeep.indexOf(name) >= 0
	            ? [left.concat(chunk), right]
	            : [left, right.concat(chunk)];
	    }, [[], []]), kept = _a[0], removed = _a[1];
	    return {
	        keptParams: parse(kept.join('&'), options),
	        querystring: kept.join('&')
	    };
	};

	exports.parse = parse;
	exports.build = build;
	exports.omit = omit;
	exports.keep = keep;
	});

	unwrapExports(cjs);
	var cjs_1 = cjs.parse;
	var cjs_2 = cjs.build;
	var cjs_3 = cjs.omit;
	var cjs_4 = cjs.keep;

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */

	var __assign = Object.assign || function __assign(t) {
	    for (var s, i = 1, n = arguments.length; i < n; i++) {
	        s = arguments[i];
	        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
	    }
	    return t;
	};

	var defaultOrConstrained = function (match) {
	    return '(' +
	        (match ? match.replace(/(^<|>$)/g, '') : "[a-zA-Z0-9-_.~%':|=+\\*@]+") +
	        ')';
	};
	var rules = [
	    {
	        name: 'url-parameter',
	        pattern: /^:([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
	        regex: function (match) {
	            return new RegExp(defaultOrConstrained(match[2]));
	        }
	    },
	    {
	        name: 'url-parameter-splat',
	        pattern: /^\*([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/,
	        regex: /([^?]*)/
	    },
	    {
	        name: 'url-parameter-matrix',
	        pattern: /^;([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
	        regex: function (match) {
	            return new RegExp(';' + match[1] + '=' + defaultOrConstrained(match[2]));
	        }
	    },
	    {
	        name: 'query-parameter',
	        pattern: /^(?:\?|&)(?::)?([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/
	    },
	    {
	        name: 'delimiter',
	        pattern: /^(\/|\?)/,
	        regex: function (match) { return new RegExp('\\' + match[0]); }
	    },
	    {
	        name: 'sub-delimiter',
	        pattern: /^(!|&|-|_|\.|;)/,
	        regex: function (match) { return new RegExp(match[0]); }
	    },
	    {
	        name: 'fragment',
	        pattern: /^([0-9a-zA-Z]+)/,
	        regex: function (match) { return new RegExp(match[0]); }
	    }
	];

	var tokenise = function (str, tokens) {
	    if (tokens === void 0) { tokens = []; }
	    // Look for a matching rule
	    var matched = rules.some(function (rule) {
	        var match = str.match(rule.pattern);
	        if (!match) {
	            return false;
	        }
	        tokens.push({
	            type: rule.name,
	            match: match[0],
	            val: match.slice(1, 2),
	            otherVal: match.slice(2),
	            regex: rule.regex instanceof Function ? rule.regex(match) : rule.regex
	        });
	        if (match[0].length < str.length) {
	            tokens = tokenise(str.substr(match[0].length), tokens);
	        }
	        return true;
	    });
	    // If no rules matched, throw an error (possible malformed path)
	    if (!matched) {
	        throw new Error("Could not parse path '" + str + "'");
	    }
	    return tokens;
	};

	var identity = function (_) { return _; };
	var exists = function (val) { return val !== undefined && val !== null; };
	var optTrailingSlash = function (source, strictTrailingSlash) {
	    if (strictTrailingSlash) {
	        return source;
	    }
	    if (source === '\\/') {
	        return source;
	    }
	    return source.replace(/\\\/$/, '') + '(?:\\/)?';
	};
	var upToDelimiter = function (source, delimiter) {
	    if (!delimiter) {
	        return source;
	    }
	    return /(\/)$/.test(source) ? source : source + '(\\/|\\?|\\.|;|$)';
	};
	var appendQueryParam = function (params, param, val) {
	    if (val === void 0) { val = ''; }
	    var existingVal = params[param];
	    if (existingVal === undefined) {
	        params[param] = val;
	    }
	    else {
	        params[param] = Array.isArray(existingVal)
	            ? existingVal.concat(val)
	            : [existingVal, val];
	    }
	    return params;
	};
	var Path = /** @class */ (function () {
	    function Path(path) {
	        if (!path) {
	            throw new Error('Missing path in Path constructor');
	        }
	        this.path = path;
	        this.tokens = tokenise(path);
	        this.hasUrlParams =
	            this.tokens.filter(function (t) { return /^url-parameter/.test(t.type); }).length > 0;
	        this.hasSpatParam =
	            this.tokens.filter(function (t) { return /splat$/.test(t.type); }).length > 0;
	        this.hasMatrixParams =
	            this.tokens.filter(function (t) { return /matrix$/.test(t.type); }).length > 0;
	        this.hasQueryParams =
	            this.tokens.filter(function (t) { return /^query-parameter/.test(t.type); }).length > 0;
	        // Extract named parameters from tokens
	        this.spatParams = this.getParams('url-parameter-splat');
	        this.urlParams = this.getParams(/^url-parameter/);
	        // Query params
	        this.queryParams = this.getParams('query-parameter');
	        // All params
	        this.params = this.urlParams.concat(this.queryParams);
	        // Check if hasQueryParams
	        // Regular expressions for url part only (full and partial match)
	        this.source = this.tokens
	            .filter(function (t) { return t.regex !== undefined; })
	            .map(function (r) { return r.regex.source; })
	            .join('');
	    }
	    Path.createPath = function (path) {
	        return new Path(path);
	    };
	    Path.prototype.isQueryParam = function (name) {
	        return this.queryParams.indexOf(name) !== -1;
	    };
	    Path.prototype.test = function (path, opts) {
	        var _this = this;
	        var options = __assign({ strictTrailingSlash: false, queryParams: {} }, opts);
	        // trailingSlash: falsy => non optional, truthy => optional
	        var source = optTrailingSlash(this.source, options.strictTrailingSlash);
	        // Check if exact match
	        var match = this.urlTest(path, source + (this.hasQueryParams ? '(\\?.*$|$)' : '$'), opts);
	        // If no match, or no query params, no need to go further
	        if (!match || !this.hasQueryParams) {
	            return match;
	        }
	        // Extract query params
	        var queryParams = cjs_1(path, options.queryParams);
	        var unexpectedQueryParams = Object.keys(queryParams).filter(function (p) { return !_this.isQueryParam(p); });
	        if (unexpectedQueryParams.length === 0) {
	            // Extend url match
	            Object.keys(queryParams).forEach(function (p) { return (match[p] = queryParams[p]); });
	            return match;
	        }
	        return null;
	    };
	    Path.prototype.partialTest = function (path, opts) {
	        var _this = this;
	        var options = __assign({ delimited: true, queryParams: {} }, opts);
	        // Check if partial match (start of given path matches regex)
	        // trailingSlash: falsy => non optional, truthy => optional
	        var source = upToDelimiter(this.source, options.delimited);
	        var match = this.urlTest(path, source, options);
	        if (!match) {
	            return match;
	        }
	        if (!this.hasQueryParams) {
	            return match;
	        }
	        var queryParams = cjs_1(path, options.queryParams);
	        Object.keys(queryParams)
	            .filter(function (p) { return _this.isQueryParam(p); })
	            .forEach(function (p) { return appendQueryParam(match, p, queryParams[p]); });
	        return match;
	    };
	    Path.prototype.build = function (params, opts) {
	        var _this = this;
	        if (params === void 0) { params = {}; }
	        var options = __assign({ ignoreConstraints: false, ignoreSearch: false, queryParams: {} }, opts);
	        var encodedUrlParams = Object.keys(params)
	            .filter(function (p) { return !_this.isQueryParam(p); })
	            .reduce(function (acc, key) {
	            if (!exists(params[key])) {
	                return acc;
	            }
	            var val = params[key];
	            var encode = _this.isQueryParam(key) ? identity : encodeURI;
	            if (typeof val === 'boolean') {
	                acc[key] = val;
	            }
	            else if (Array.isArray(val)) {
	                acc[key] = val.map(encode);
	            }
	            else {
	                acc[key] = encode(val);
	            }
	            return acc;
	        }, {});
	        // Check all params are provided (not search parameters which are optional)
	        if (this.urlParams.some(function (p) { return !exists(params[p]); })) {
	            var missingParameters = this.urlParams.filter(function (p) { return !exists(params[p]); });
	            throw new Error("Cannot build path: '" +
	                this.path +
	                "' requires missing parameters { " +
	                missingParameters.join(', ') +
	                ' }');
	        }
	        // Check constraints
	        if (!options.ignoreConstraints) {
	            var constraintsPassed = this.tokens
	                .filter(function (t) {
	                return /^url-parameter/.test(t.type) && !/-splat$/.test(t.type);
	            })
	                .every(function (t) {
	                return new RegExp('^' + defaultOrConstrained(t.otherVal[0]) + '$').test(encodedUrlParams[t.val]);
	            });
	            if (!constraintsPassed) {
	                throw new Error("Some parameters of '" + this.path + "' are of invalid format");
	            }
	        }
	        var base = this.tokens
	            .filter(function (t) { return /^query-parameter/.test(t.type) === false; })
	            .map(function (t) {
	            if (t.type === 'url-parameter-matrix') {
	                return ";" + t.val + "=" + encodedUrlParams[t.val[0]];
	            }
	            return /^url-parameter/.test(t.type)
	                ? encodedUrlParams[t.val[0]]
	                : t.match;
	        })
	            .join('');
	        if (options.ignoreSearch) {
	            return base;
	        }
	        var searchParams = this.queryParams
	            .filter(function (p) { return Object.keys(params).indexOf(p) !== -1; })
	            .reduce(function (sparams, paramName) {
	            sparams[paramName] = params[paramName];
	            return sparams;
	        }, {});
	        var searchPart = cjs_2(searchParams, options.queryParams);
	        return searchPart ? base + '?' + searchPart : base;
	    };
	    Path.prototype.getParams = function (type) {
	        var predicate = type instanceof RegExp
	            ? function (t) { return type.test(t.type); }
	            : function (t) { return t.type === type; };
	        return this.tokens.filter(predicate).map(function (t) { return t.val[0]; });
	    };
	    Path.prototype.urlTest = function (path, source, _a) {
	        var _this = this;
	        var _b = (_a === void 0 ? {} : _a).caseSensitive, caseSensitive = _b === void 0 ? false : _b;
	        var regex = new RegExp('^' + source, caseSensitive ? '' : 'i');
	        var match = path.match(regex);
	        if (!match) {
	            return null;
	        }
	        else if (!this.urlParams.length) {
	            return {};
	        }
	        // Reduce named params to key-value pairs
	        return match
	            .slice(1, this.urlParams.length + 1)
	            .reduce(function (params, m, i) {
	            params[_this.urlParams[i]] = decodeURIComponent(m);
	            return params;
	        }, {});
	    };
	    return Path;
	}());

	function noop$1() {}

	function safe_not_equal$1(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}
	function writable(value, start = noop$1) {
	    let stop;
	    const subscribers = [];
	    function set(new_value) {
	        if (safe_not_equal$1(value, new_value)) {
	            value = new_value;
	            if (!stop) {
	                return; // not ready
	            }
	            subscribers.forEach((s) => s[1]());
	            subscribers.forEach((s) => s[0](value));
	        }
	    }
	    function update(fn) {
	        set(fn(value));
	    }
	    function subscribe$$1(run$$1, invalidate = noop$1) {
	        const subscriber = [run$$1, invalidate];
	        subscribers.push(subscriber);
	        if (subscribers.length === 1) {
	            stop = start(set) || noop$1;
	        }
	        run$$1(value);
	        return () => {
	            const index = subscribers.indexOf(subscriber);
	            if (index !== -1) {
	                subscribers.splice(index, 1);
	            }
	            if (subscribers.length === 0) {
	                stop();
	            }
	        };
	    }
	    return { set, update, subscribe: subscribe$$1 };
	}

	/* node_modules/svero/src/Router.svelte generated by Svelte v3.4.0 */

	const file = "node_modules/svero/src/Router.svelte";

	// (136:0) {#if !ctxLoaded}
	function create_if_block(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "ctx svelte-2phnq8";
				div.dataset.svero = "ctx";
				add_location(div, file, 136, 2, 3200);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var t_1, current, dispose;

		var if_block = (!ctx.ctxLoaded) && create_if_block(ctx);

		const default_slot_1 = ctx.$$slots.default;
		const default_slot = create_slot(default_slot_1, ctx, null);

		return {
			c: function create() {
				if (if_block) if_block.c();
				t_1 = space();

				if (default_slot) default_slot.c();

				dispose = listen(window, "popstate", ctx.handlePopState);
			},

			l: function claim(nodes) {
				if (default_slot) default_slot.l(nodes);
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, t_1, anchor);

				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (!ctx.ctxLoaded) {
					if (!if_block) {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(t_1.parentNode, t_1);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}

				if (default_slot && default_slot.p && changed.$$scope) {
					default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
				}
			},

			i: function intro(local) {
				if (current) return;
				if (default_slot && default_slot.i) default_slot.i(local);
				current = true;
			},

			o: function outro(local) {
				if (default_slot && default_slot.o) default_slot.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach(t_1);
				}

				if (default_slot) default_slot.d(detaching);
				dispose();
			}
		};
	}

	function gotoRoute(route) {
	  history.pushState({}, '', route);

	  const popEvent = new Event('popstate');
	  window.dispatchEvent(popEvent);
	}

	function instance($$self, $$props, $$invalidate) {
		let $activePath;

		

	  let t;
	  let ctx;
	  let ctxLoaded = false;
	  let currentComponent = null;

	  const paths = [];
	  const activePath = writable(null); validate_store(activePath, 'activePath'); subscribe($$self, activePath, $$value => { $activePath = $$value; $$invalidate('$activePath', $activePath); });

	  function updateComponent(route, params = {}) {
	    if (currentComponent && currentComponent.$destroy) {
	      currentComponent.$destroy();
	      $$invalidate('currentComponent', currentComponent = null);
	    }

	    $activePath = route.path; activePath.set($activePath);

	    if (!route.component) return;

	    $$invalidate('currentComponent', currentComponent = new route.component({
	      target: ctx,
	      props: {
	        router: {
	          route,
	          params
	        }
	      }
	    }));
	  }

	  function handleRoute(route, result) {
	    // If there is no condition, but there is a redirect, simply redirect
	    if (!route.condition && route.redirect) {
	      gotoRoute(route.redirect);
	      return true;
	    }

	    // If there is condition, handle it
	    if (route.condition && (typeof route.condition === 'boolean' || typeof route.condition === 'function')) {
	      if (typeof route.condition === 'boolean' && route.condition) {
	        updateComponent(route, result);
	        return true;
	      }

	      if (typeof route.condition === 'function' && route.condition()) {
	        updateComponent(route, result);
	        return true;
	      }

	      gotoRoute(route.redirect);
	      return true;
	    }

	    updateComponent(route, result);
	    return true;
	  }

	  function handlePopState() {
	    paths.some((route) => {
	      const browserPath = window.location.pathname;

	      // If route matches exactly the url path, load the component
	      // and stop the route checking
	      if (route.path === browserPath) {
	        return handleRoute(route);
	      }

	      // If route includes params, check if it matches with the URL
	      // and stop the route checking
	      if (route.path.includes(':')) {
	        const path = new Path(route.path);
	        const result = path.test(browserPath);

	        if (result) {
	          return handleRoute(route, result);
	        }
	      }

	      // If route is wildcard (*), fallbacks to the component
	      // and stop the route checking
	      if (route.path === '*') {
	        return handleRoute(route);
	      }
	    });
	  }

	  function debouncedHandlePopState() {
	    clearTimeout(t);
	    $$invalidate('t', t = setTimeout(handlePopState, 100));
	  }

	  function assignRoute(route) {
	    paths.push(route);
	    debouncedHandlePopState();
	  }

	  onMount(() => {
	    $$invalidate('ctx', ctx = document.querySelector('[data-svero="ctx"]').parentElement);
	    $$invalidate('ctxLoaded', ctxLoaded = true);
	    debouncedHandlePopState();
	  });

	  setContext('__svero__', {
	    activePath,
	    paths,
	    gotoRoute,
	    assignRoute,
	    updateComponent
	  });

		let { $$slots = {}, $$scope } = $$props;

		$$self.$set = $$props => {
			if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
		};

		return {
			ctxLoaded,
			activePath,
			handlePopState,
			$$slots,
			$$scope
		};
	}

	class Router extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	/* node_modules/svero/src/Route.svelte generated by Svelte v3.4.0 */

	// (20:0) {#if $activePath === path && !component}
	function create_if_block$1(ctx) {
		var current;

		const default_slot_1 = ctx.$$slots.default;
		const default_slot = create_slot(default_slot_1, ctx, null);

		return {
			c: function create() {
				if (default_slot) default_slot.c();
			},

			l: function claim(nodes) {
				if (default_slot) default_slot.l(nodes);
			},

			m: function mount(target, anchor) {
				if (default_slot) {
					default_slot.m(target, anchor);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (default_slot && default_slot.p && changed.$$scope) {
					default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
				}
			},

			i: function intro(local) {
				if (current) return;
				if (default_slot && default_slot.i) default_slot.i(local);
				current = true;
			},

			o: function outro(local) {
				if (default_slot && default_slot.o) default_slot.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (default_slot) default_slot.d(detaching);
			}
		};
	}

	function create_fragment$1(ctx) {
		var if_block_anchor, current;

		var if_block = (ctx.$activePath === ctx.path && !ctx.component) && create_if_block$1(ctx);

		return {
			c: function create() {
				if (if_block) if_block.c();
				if_block_anchor = empty();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				if (if_block) if_block.m(target, anchor);
				insert(target, if_block_anchor, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				if (ctx.$activePath === ctx.path && !ctx.component) {
					if (if_block) {
						if_block.p(changed, ctx);
						if_block.i(1);
					} else {
						if_block = create_if_block$1(ctx);
						if_block.c();
						if_block.i(1);
						if_block.m(if_block_anchor.parentNode, if_block_anchor);
					}
				} else if (if_block) {
					group_outros();
					on_outro(() => {
						if_block.d(1);
						if_block = null;
					});

					if_block.o(1);
					check_outros();
				}
			},

			i: function intro(local) {
				if (current) return;
				if (if_block) if_block.i();
				current = true;
			},

			o: function outro(local) {
				if (if_block) if_block.o();
				current = false;
			},

			d: function destroy(detaching) {
				if (if_block) if_block.d(detaching);

				if (detaching) {
					detach(if_block_anchor);
				}
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let $activePath;

		const { assignRoute, unassignRoute, activePath } = getContext('__svero__'); validate_store(activePath, 'activePath'); subscribe($$self, activePath, $$value => { $activePath = $$value; $$invalidate('$activePath', $activePath); });

	  let { path = '/', component = undefined, condition = undefined, redirect = undefined } = $$props;

	  onMount(() => {
	    assignRoute({ path, component, condition, redirect });
	  });

	  onDestroy(() => {
	    unassignRoute(path);
	  });

		let { $$slots = {}, $$scope } = $$props;

		$$self.$set = $$props => {
			if ('path' in $$props) $$invalidate('path', path = $$props.path);
			if ('component' in $$props) $$invalidate('component', component = $$props.component);
			if ('condition' in $$props) $$invalidate('condition', condition = $$props.condition);
			if ('redirect' in $$props) $$invalidate('redirect', redirect = $$props.redirect);
			if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
		};

		return {
			activePath,
			path,
			component,
			condition,
			redirect,
			$activePath,
			$$slots,
			$$scope
		};
	}

	class Route extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component", "condition", "redirect"]);
		}

		get path() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set path(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get component() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set component(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get condition() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set condition(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get redirect() {
			throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set redirect(value) {
			throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	function navigateTo(path) {
	  // If path empty or no string, throws error
	  if (!path || typeof path !== 'string') {
	    throw Error(`svero expects navigateTo() to have a string parameter. The parameter provided was: ${path} of type ${typeof path} instead.`);
	  }

	  if (path[0] !== '/') {
	    throw Error(`svero expects navigateTo() param to start with slash, e.g. "/${path}" instead of "${path}".`);
	  }

	  // If no History API support, fallbacks to URL redirect
	  if (!history.pushState || !window.dispatchEvent) {
	    window.location.href = path;
	    return;
	  }

	  // If has History API support, uses it
	  history.pushState({}, '', path);
	  window.dispatchEvent(new Event('popstate'));
	}

	/* node_modules/svero/src/Link.svelte generated by Svelte v3.4.0 */

	const file$1 = "node_modules/svero/src/Link.svelte";

	function create_fragment$2(ctx) {
		var a, current, dispose;

		const default_slot_1 = ctx.$$slots.default;
		const default_slot = create_slot(default_slot_1, ctx, null);

		return {
			c: function create() {
				a = element("a");

				if (default_slot) default_slot.c();

				a.href = ctx.href;
				a.className = ctx.className;
				add_location(a, file$1, 13, 0, 267);
				dispose = listen(a, "click", prevent_default(ctx.click_handler));
			},

			l: function claim(nodes) {
				if (default_slot) default_slot.l(a_nodes);
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);

				if (default_slot) {
					default_slot.m(a, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (default_slot && default_slot.p && changed.$$scope) {
					default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
				}

				if (!current || changed.href) {
					a.href = ctx.href;
				}

				if (!current || changed.className) {
					a.className = ctx.className;
				}
			},

			i: function intro(local) {
				if (current) return;
				if (default_slot && default_slot.i) default_slot.i(local);
				current = true;
			},

			o: function outro(local) {
				if (default_slot && default_slot.o) default_slot.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				if (default_slot) default_slot.d(detaching);
				dispose();
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		
	  let { class: cssClass = '', href = '/', className = '' } = $$props;

	  onMount(() => {
	    $$invalidate('className', className = className || cssClass);
	  });

		let { $$slots = {}, $$scope } = $$props;

		function click_handler() {
			return navigateTo(href);
		}

		$$self.$set = $$props => {
			if ('class' in $$props) $$invalidate('cssClass', cssClass = $$props.class);
			if ('href' in $$props) $$invalidate('href', href = $$props.href);
			if ('className' in $$props) $$invalidate('className', className = $$props.className);
			if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
		};

		return {
			cssClass,
			href,
			className,
			click_handler,
			$$slots,
			$$scope
		};
	}

	class Link extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["class", "href", "className"]);
		}

		get class() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set class(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get href() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set href(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		get className() {
			throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set className(value) {
			throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	// This file creates a svelte store for keeping track of the current URL location because svero doesn't expose it by default. It's used by the NavLink component in components/NavLink.svelte

	const currentRoute = writable(window.location.pathname);

	/* src/components/NavLink.svelte generated by Svelte v3.4.0 */

	const file$2 = "src/components/NavLink.svelte";

	// (14:4) <Link href="{href}">
	function create_default_slot(ctx) {
		var span, span_class_value, current, dispose;

		const default_slot_1 = ctx.$$slots.default;
		const default_slot = create_slot(default_slot_1, ctx, null);

		return {
			c: function create() {
				span = element("span");

				if (default_slot) default_slot.c();

				span.className = span_class_value = "" + (ctx.$currentRoute === ctx.href ? 'active' : 'pb-4') + " svelte-xfyrub";
				add_location(span, file$2, 14, 8, 656);
				dispose = listen(span, "click", ctx.updateRoute);
			},

			l: function claim(nodes) {
				if (default_slot) default_slot.l(span_nodes);
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);

				if (default_slot) {
					default_slot.m(span, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (default_slot && default_slot.p && changed.$$scope) {
					default_slot.p(get_slot_changes(default_slot_1, ctx, changed, null), get_slot_context(default_slot_1, ctx, null));
				}

				if ((!current || changed.$currentRoute || changed.href) && span_class_value !== (span_class_value = "" + (ctx.$currentRoute === ctx.href ? 'active' : 'pb-4') + " svelte-xfyrub")) {
					span.className = span_class_value;
				}
			},

			i: function intro(local) {
				if (current) return;
				if (default_slot && default_slot.i) default_slot.i(local);
				current = true;
			},

			o: function outro(local) {
				if (default_slot && default_slot.o) default_slot.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}

				if (default_slot) default_slot.d(detaching);
				dispose();
			}
		};
	}

	function create_fragment$3(ctx) {
		var span, current;

		var link = new Link({
			props: {
			href: ctx.href,
			$$slots: { default: [create_default_slot] },
			$$scope: { ctx }
		},
			$$inline: true
		});

		return {
			c: function create() {
				span = element("span");
				link.$$.fragment.c();
				span.className = "px-1 py-1 m-2";
				add_location(span, file$2, 12, 0, 594);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, span, anchor);
				mount_component(link, span, null);
				current = true;
			},

			p: function update(changed, ctx) {
				var link_changes = {};
				if (changed.href) link_changes.href = ctx.href;
				if (changed.$$scope || changed.$currentRoute || changed.href) link_changes.$$scope = { changed, ctx };
				link.$set(link_changes);
			},

			i: function intro(local) {
				if (current) return;
				link.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				link.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(span);
				}

				link.$destroy();
			}
		};
	}

	function instance$3($$self, $$props, $$invalidate) {
		let $currentRoute;

		validate_store(currentRoute, 'currentRoute');
		subscribe($$self, currentRoute, $$value => { $currentRoute = $$value; $$invalidate('$currentRoute', $currentRoute); });

		
	let { href } = $$props;
	function updateRoute(event) {
	    currentRoute.set(href);
	}

		let { $$slots = {}, $$scope } = $$props;

		$$self.$set = $$props => {
			if ('href' in $$props) $$invalidate('href', href = $$props.href);
			if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
		};

		return {
			href,
			updateRoute,
			$currentRoute,
			$$slots,
			$$scope
		};
	}

	class NavLink extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$3, create_fragment$3, safe_not_equal, ["href"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.href === undefined && !('href' in props)) {
				console.warn("<NavLink> was created without expected prop 'href'");
			}
		}

		get href() {
			throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set href(value) {
			throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/components/Nav.svelte generated by Svelte v3.4.0 */

	const file$3 = "src/components/Nav.svelte";

	// (11:4) <NavLink href="/">
	function create_default_slot_1(ctx) {
		var t;

		return {
			c: function create() {
				t = text("home");
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	// (12:4) <NavLink href="/about">
	function create_default_slot$1(ctx) {
		var t;

		return {
			c: function create() {
				t = text("about");
			},

			m: function mount(target, anchor) {
				insert(target, t, anchor);
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(t);
				}
			}
		};
	}

	function create_fragment$4(ctx) {
		var nav, t0, t1, div, current;

		var navlink0 = new NavLink({
			props: {
			href: "/",
			$$slots: { default: [create_default_slot_1] },
			$$scope: { ctx }
		},
			$$inline: true
		});

		var navlink1 = new NavLink({
			props: {
			href: "/about",
			$$slots: { default: [create_default_slot$1] },
			$$scope: { ctx }
		},
			$$inline: true
		});

		return {
			c: function create() {
				nav = element("nav");
				navlink0.$$.fragment.c();
				t0 = space();
				navlink1.$$.fragment.c();
				t1 = space();
				div = element("div");
				nav.className = "fixed flex flex-row bg-white border-red-100 border-b-2 text-lg font-light w-full";
				add_location(nav, file$3, 9, 0, 299);
				div.className = "pb-8 mb-8";
				add_location(div, file$3, 13, 0, 481);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, nav, anchor);
				mount_component(navlink0, nav, null);
				append(nav, t0);
				mount_component(navlink1, nav, null);
				insert(target, t1, anchor);
				insert(target, div, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var navlink0_changes = {};
				if (changed.$$scope) navlink0_changes.$$scope = { changed, ctx };
				navlink0.$set(navlink0_changes);

				var navlink1_changes = {};
				if (changed.$$scope) navlink1_changes.$$scope = { changed, ctx };
				navlink1.$set(navlink1_changes);
			},

			i: function intro(local) {
				if (current) return;
				navlink0.$$.fragment.i(local);

				navlink1.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				navlink0.$$.fragment.o(local);
				navlink1.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(nav);
				}

				navlink0.$destroy();

				navlink1.$destroy();

				if (detaching) {
					detach(t1);
					detach(div);
				}
			}
		};
	}

	class Nav extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$4, safe_not_equal, []);
		}
	}

	/* src/components/Button.svelte generated by Svelte v3.4.0 */

	const file$4 = "src/components/Button.svelte";

	function create_fragment$5(ctx) {
		var button, t0, t1, t2, t3_value = ctx.clicks === 1 ? 'time' : 'times', t3, dispose;

		return {
			c: function create() {
				button = element("button");
				t0 = text("Clicked ");
				t1 = text(ctx.clicks);
				t2 = space();
				t3 = text(t3_value);
				button.className = "color space border-none bg-blue-700 hover:bg-blue-400 rounded svelte-folwfl";
				add_location(button, file$4, 9, 0, 280);
				dispose = listen(button, "click", ctx.handleClick);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, button, anchor);
				append(button, t0);
				append(button, t1);
				append(button, t2);
				append(button, t3);
			},

			p: function update(changed, ctx) {
				if (changed.clicks) {
					set_data(t1, ctx.clicks);
				}

				if ((changed.clicks) && t3_value !== (t3_value = ctx.clicks === 1 ? 'time' : 'times')) {
					set_data(t3, t3_value);
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(button);
				}

				dispose();
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		let clicks = 0;

	  const handleClick = () => { const $$result = (clicks += 1); $$invalidate('clicks', clicks); return $$result; };

		return { clicks, handleClick };
	}

	class Button extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$5, safe_not_equal, []);
		}
	}

	/* src/routes/About.svelte generated by Svelte v3.4.0 */

	const file$5 = "src/routes/About.svelte";

	function create_fragment$6(ctx) {
		var div1, h1, t1, p, t3, div0, current;

		var button = new Button({ $$inline: true });

		return {
			c: function create() {
				div1 = element("div");
				h1 = element("h1");
				h1.textContent = "About this site";
				t1 = space();
				p = element("p");
				p.textContent = "This is the 'about' page. There's not much here. Why don't you click the button?";
				t3 = space();
				div0 = element("div");
				button.$$.fragment.c();
				h1.className = "text-xl md:text-3xl text-justify text-gray-900";
				add_location(h1, file$5, 9, 10, 247);
				p.className = "text-justify py-6";
				add_location(p, file$5, 12, 10, 363);
				div0.className = "flex justify-center py-8";
				add_location(div0, file$5, 14, 10, 488);
				div1.className = "relative mx-32 px-32 py-4";
				add_location(div1, file$5, 8, 2, 197);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div1, anchor);
				append(div1, h1);
				append(div1, t1);
				append(div1, p);
				append(div1, t3);
				append(div1, div0);
				mount_component(button, div0, null);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				button.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				button.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div1);
				}

				button.$destroy();
			}
		};
	}

	function instance$5($$self, $$props, $$invalidate) {
		let { router = {} } = $$props;

		$$self.$set = $$props => {
			if ('router' in $$props) $$invalidate('router', router = $$props.router);
		};

		return { router };
	}

	class About extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$5, create_fragment$6, safe_not_equal, ["router"]);
		}

		get router() {
			throw new Error("<About>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set router(value) {
			throw new Error("<About>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/routes/Home.svelte generated by Svelte v3.4.0 */

	const file$6 = "src/routes/Home.svelte";

	function create_fragment$7(ctx) {
		var div2, div0, h1, t1, div1, figure, img, t2, figcaption;

		return {
			c: function create() {
				div2 = element("div");
				div0 = element("div");
				h1 = element("h1");
				h1.textContent = "Great success!";
				t1 = space();
				div1 = element("div");
				figure = element("figure");
				img = element("img");
				t2 = space();
				figcaption = element("figcaption");
				figcaption.textContent = "HIGH FIVE!";
				h1.className = "text-4xl md:text-6xl text-center uppercase font-bold text-gray-900";
				add_location(h1, file$6, 8, 8, 211);
				div0.className = "flex justify-center";
				add_location(div0, file$6, 7, 4, 169);
				img.src = "static/great-success.png";
				img.alt = "Borat";
				img.className = "max-w-sm w-full mb-4";
				add_location(img, file$6, 14, 12, 430);
				add_location(figcaption, file$6, 15, 12, 520);
				figure.className = "text-center";
				add_location(figure, file$6, 13, 8, 389);
				div1.className = "flex justify-center";
				add_location(div1, file$6, 12, 4, 347);
				div2.className = "flex flex-col";
				add_location(div2, file$6, 6, 0, 137);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div0);
				append(div0, h1);
				append(div2, t1);
				append(div2, div1);
				append(div1, figure);
				append(figure, img);
				append(figure, t2);
				append(figure, figcaption);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	class Home extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$7, safe_not_equal, []);
		}
	}

	/* src/App.svelte generated by Svelte v3.4.0 */

	// (12:0) <Router>
	function create_default_slot$2(ctx) {
		var t, current;

		var route0 = new Route({
			props: { path: "*", component: Home },
			$$inline: true
		});

		var route1 = new Route({
			props: { path: "/about", component: About },
			$$inline: true
		});

		return {
			c: function create() {
				route0.$$.fragment.c();
				t = space();
				route1.$$.fragment.c();
			},

			m: function mount(target, anchor) {
				mount_component(route0, target, anchor);
				insert(target, t, anchor);
				mount_component(route1, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var route0_changes = {};
				if (changed.Home) route0_changes.component = Home;
				route0.$set(route0_changes);

				var route1_changes = {};
				if (changed.About) route1_changes.component = About;
				route1.$set(route1_changes);
			},

			i: function intro(local) {
				if (current) return;
				route0.$$.fragment.i(local);

				route1.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				route0.$$.fragment.o(local);
				route1.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				route0.$destroy(detaching);

				if (detaching) {
					detach(t);
				}

				route1.$destroy(detaching);
			}
		};
	}

	function create_fragment$8(ctx) {
		var t, current;

		var nav = new Nav({ $$inline: true });

		var router = new Router({
			props: {
			$$slots: { default: [create_default_slot$2] },
			$$scope: { ctx }
		},
			$$inline: true
		});

		return {
			c: function create() {
				nav.$$.fragment.c();
				t = space();
				router.$$.fragment.c();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				mount_component(nav, target, anchor);
				insert(target, t, anchor);
				mount_component(router, target, anchor);
				current = true;
			},

			p: function update(changed, ctx) {
				var router_changes = {};
				if (changed.$$scope) router_changes.$$scope = { changed, ctx };
				router.$set(router_changes);
			},

			i: function intro(local) {
				if (current) return;
				nav.$$.fragment.i(local);

				router.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				nav.$$.fragment.o(local);
				router.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				nav.$destroy(detaching);

				if (detaching) {
					detach(t);
				}

				router.$destroy(detaching);
			}
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$8, safe_not_equal, []);
		}
	}

	// Load tailwind and setup the App

	const app = new App({
	    target: document.body
	});

	return app;

}());
//# sourceMappingURL=main.js.map
