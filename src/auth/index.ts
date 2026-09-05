// Authentication kernel: what authentication *is*, plus the passport
// strategies it defines. The factories that assemble it into a Nest module
// (guards, controller, module) live in `src/common`, and each domain gets its
// own folder (see `src/auth-user`).
export * from './config/index.js';
export * from './dto/index.js';
export * from './services/index.js';
export * from './strategies/index.js';
export * from './types/index.js';
export * from './utils/index.js';
