// vitest runs outside Next's bundler, which is what normally resolves the
// "server-only" package via a build-time alias. Stub it so unit tests can
// import server-only modules directly.
export {};
