/* tslint:disable */
/* eslint-disable */
export function main_js(): void;
/**
 * Valida se o arquivo atende aos critérios (PDF, max 5MB, nome único)
 */
export function validate_file(file_name: string, file_size: number): string;
/**
 * Adiciona arquivo temporariamente (antes dos metadados)
 */
export function add_file_temporarily(file_name: string, file_data: Uint8Array): void;
/**
 * Remove arquivo temporário (quando usuário cancela)
 */
export function remove_temporary_file(file_name: string): void;
/**
 * Remove arquivo processado (arquivo + metadados)
 */
export function remove_processed_file(file_name: string): void;
/**
 * Adiciona metadados do arquivo (recebe JSON estruturado do JavaScript)
 */
export function add_file_metadata(file_name: string, category: string, details_json: string): void;
/**
 * Retorna a versão do Aatico do Cargo.toml
 */
export function get_version(): string;
/**
 * Retorna a data e hora de compilação do WASM
 */
export function get_build_time(): string;
/**
 * Retorna os metadados de todos os arquivos para processamento JavaScript
 */
export function get_files_with_metadata(): string;
/**
 * Gera arquivo ZIP contendo todos os PDFs de atividades complementares e seus metadados.
 * Depois de zipar, limpa o armazenamento.
 */
export function zip_and_clear_files(): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly main_js: () => void;
  readonly validate_file: (a: number, b: number, c: number) => [number, number];
  readonly add_file_temporarily: (a: number, b: number, c: number, d: number) => [number, number];
  readonly remove_temporary_file: (a: number, b: number) => [number, number];
  readonly remove_processed_file: (a: number, b: number) => [number, number];
  readonly add_file_metadata: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number];
  readonly get_version: () => [number, number];
  readonly get_build_time: () => [number, number];
  readonly get_files_with_metadata: () => [number, number, number, number];
  readonly zip_and_clear_files: () => [number, number, number, number];
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export_3: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
