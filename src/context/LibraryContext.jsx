import { createContext, useContext, useState } from 'react'

const LibraryContext = createContext()

export function LibraryProvider({ children }) {
  const [refreshKey, setRefreshKey]     = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editVideo, setEditVideo]       = useState(null)

  return (
    <LibraryContext.Provider value={{
      refreshKey,
      triggerRefresh: () => setRefreshKey(k => k + 1),
      // Add modal
      showAddModal,
      openAddModal:  () => { setEditVideo(null); setShowAddModal(true) },
      closeAddModal: () => setShowAddModal(false),
      // Edit modal
      editVideo,
      openEditModal:  (video) => { setShowAddModal(false); setEditVideo(video) },
      closeEditModal: () => setEditVideo(null),
    }}>
      {children}
    </LibraryContext.Provider>
  )
}

export const useLibrary = () => useContext(LibraryContext)
