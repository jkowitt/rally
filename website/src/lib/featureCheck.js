// Check if an AI feature is enabled (developer can toggle off from Dev Tools)
export function isAIFeatureEnabled(key) {
  try {
    return localStorage.getItem(`ll_flag_${key}`) !== 'off'
  } catch {
    return true // default on if localStorage fails
  }
}
