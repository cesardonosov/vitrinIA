/**
 * A config of any historical version: an object with an integer
 * `schemaVersion`. Migrations work on this loose shape because old data was
 * validated by an old schema, not the current one.
 */
export interface VersionedConfig {
  readonly schemaVersion: number;
  readonly [key: string]: unknown;
}

/** Pure, total, synchronous: `vN -> vN+1`. Never throws, never does I/O. */
export type Migration = (config: VersionedConfig) => VersionedConfig;
