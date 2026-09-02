// Pont vers le Google Apps Script qui génère les bilans IA.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxeipfd2MOSAwUms8yX_Gh9eCbODKDzVGLqDhxi7lk0Ni3lBrBOHaVHV6M0UYb5W8X3gw/exec";

export async function callAppsScript(action: string, payload: any) {
  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (error) { console.error("Fetch error:", error); throw error; }
}
