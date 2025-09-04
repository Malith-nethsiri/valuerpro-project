// Clear all browser storage and force refresh
console.log('🧹 Clearing all browser caches and storage...');

// Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// Clear sessionStorage  
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// Clear IndexedDB if available
if ('indexedDB' in window) {
  // This is a more aggressive approach for cache clearing
  indexedDB.databases().then(databases => {
    databases.forEach(db => {
      indexedDB.deleteDatabase(db.name);
    });
  }).catch(() => {});
}

// Clear Cache API if available
if ('caches' in window) {
  caches.keys().then(names => {
    names.forEach(name => {
      caches.delete(name);
      console.log(`✅ Deleted cache: ${name}`);
    });
  }).catch(() => {});
}

// Clear cookies (for current domain only)
document.cookie.split(";").forEach(function(c) {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log('✅ Cookies cleared');

// Wait a bit then hard reload with cache bypass
setTimeout(() => {
  console.log('🔄 Performing hard reload...');
  // Force reload with cache bypass
  window.location.reload(true);
  // If that doesn't work, try this
  if (window.location.reload) {
    window.location.href = window.location.href + '?bust=' + Date.now();
  }
}, 1000);
