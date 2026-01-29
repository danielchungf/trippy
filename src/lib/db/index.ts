// Re-export all database functions for easy importing
// Usage: import { getTrips, createTrip, addLocation } from '@/lib/db'

export {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  type TripWithOwnership,
} from './trips'

export {
  getTripMembers,
  inviteMember,
  removeMember,
  acceptPendingInvites,
  isOwnerOfTrip,
} from './sharing'

export {
  addLocation,
  updateLocation,
  deleteLocation,
} from './locations'

export {
  addAccommodation,
  updateAccommodation,
  deleteAccommodation,
} from './accommodations'

export {
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace,
} from './saved-places'

export {
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  moveActivity,
  updateDayName,
  createActivityFromPlace,
} from './activities'

export {
  getPackingItems,
  addPackingItem,
  updatePackingItem,
  deletePackingItem,
  togglePackingItemPacked,
} from './packing-items'
