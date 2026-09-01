// Authentication kernel: what authentication *is*, plus the passport
// strategies it defines. The factories that assemble it into a Nest module
// (guards, controller, module) live in `src/common`, and each domain gets its
// own folder (see `src/auth-user`).
export * from './config';
export * from './dto';
export * from './services';
export * from './strategies';
export * from './types';
export * from './utils';
