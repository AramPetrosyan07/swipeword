class CollectionsManager {
  createCollection(name, wordIds) {
    const col = {
      id: Date.now().toString(),
      name,
      wordIds,
    };
    appStore.data.collections.push(col);
    appStore.save();
    return col;
  }

  deleteCollection(id) {
    appStore.data.collections = appStore.data.collections.filter((c) => c.id !== id);
    appStore.save();
  }

  addToCollection(collectionId, wordIds) {
    const col = appStore.data.collections.find((c) => c.id === collectionId);
    if (!col) return;
    wordIds.forEach((id) => {
      if (!col.wordIds.includes(id)) col.wordIds.push(id);
    });
    appStore.save();
  }

  removeFromCollection(collectionId, wordIds) {
    const col = appStore.data.collections.find((c) => c.id === collectionId);
    if (!col) return;
    col.wordIds = col.wordIds.filter((id) => !wordIds.includes(id));
    appStore.save();
  }

  getCollection(id) {
    return appStore.data.collections.find((c) => c.id === id);
  }

  getAllCollections() {
    return appStore.data.collections || [];
  }

  getCollectionWords(id) {
    const col = this.getCollection(id);
    if (!col) return [];
    return appStore.getAllWords().filter((w) => col.wordIds.includes(w.id));
  }
}

const collectionsManager = new CollectionsManager();
