export const StorageKeys = {
  API_KEY: "reader_partner_api_key",
  MODEL: "reader_partner_model"
}

export const getStorage = async (key: string): Promise<string> => {
  const result = await chrome.storage.local.get(key)
  return result[key] || ""
}

export const setStorage = async (key: string, value: string): Promise<void> => {
  await chrome.storage.local.set({ [key]: value })
}
