// Canned responses feature has been removed from this project.

export async function getCannedResponses() {
  // Return empty list to indicate feature is unavailable
  return []
}

export async function createCannedResponse() {
  return { success: false, error: 'Canned responses feature has been removed from this project.' }
}

export async function updateCannedResponse() {
  return { success: false, error: 'Canned responses feature has been removed from this project.' }
}

export async function deleteCannedResponse() {
  return { success: false, error: 'Canned responses feature has been removed from this project.' }
}