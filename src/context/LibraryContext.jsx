import { createContext, useContext, useState } from 'react'

const LibraryContext = createContext()

/**
 * Provides two shared states across the protected app:
 *  - refreshKey   : incrementing number — HomePage re-fetches when it changes
 *  - showAddModal : opens/closes <AddVideoModal>
 */
export function LibraryProvider({ children }) {
  const [refreshKey, setRefreshKey]     = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <LibraryContext.Provider value={{
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
      showAddModal,
      openAddModal:  () => setShowAddModal(true),
      closeAddModal: () => setShowAddModal(false),
    }}>
      {children}
    </LibraryContext.Provider>
  )
}

export const useLibrary = () => useContext(LibraryContext)
