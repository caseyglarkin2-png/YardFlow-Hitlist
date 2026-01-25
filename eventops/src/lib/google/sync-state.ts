let GLOBAL_SYNC_ENABLED = true;

export function setGlobalSyncEnabled(enabled: boolean) {
  GLOBAL_SYNC_ENABLED = enabled;
}

export function getGlobalSyncEnabled() {
  return GLOBAL_SYNC_ENABLED;
}
