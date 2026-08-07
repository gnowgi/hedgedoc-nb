// Null shim for readline-sync which is imported by tau-prolog's core module.
// readline-sync is only used for interactive TTY input (Node.js REPL),
// which is irrelevant in the browser. This shim prevents the module from
// trying to access Node-only APIs (fs, child_process, process.binding, etc.)
// that crash in Firefox and other non-Chromium browsers.
export default {}
