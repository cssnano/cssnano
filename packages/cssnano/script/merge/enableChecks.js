import { enableConsistencyChecks } from '../../src/run/consistencyChecks.js';

// Preloads the consistency checks into a process, such as a fuzz sweep or the integration tests run with `node --import`.
enableConsistencyChecks(true);
