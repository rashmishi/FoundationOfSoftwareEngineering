// Gives each app its own slice of localStorage and sessionStorage.
//
// On GitHub Pages every app shares one origin, so two apps that use the same
// key (for example "notes-kanban:v1") would read and overwrite each other's
// data. hub/build.mjs copies this file into each built app, filling in the
// scope placeholder with the app's path, and loads it before the app's code.
// Keys are then transparently stored as "<scope>::<key>".
(function () {
  var scope = __SCOPE__ + '::';
  var proto = Storage.prototype;
  var native = {
    getItem: proto.getItem,
    setItem: proto.setItem,
    removeItem: proto.removeItem,
    key: proto.key,
    clear: proto.clear,
    length: Object.getOwnPropertyDescriptor(proto, 'length').get,
  };

  function ownKeys(storage) {
    var keys = [];
    var n = native.length.call(storage);
    for (var i = 0; i < n; i++) {
      var k = native.key.call(storage, i);
      if (k !== null && k.indexOf(scope) === 0) keys.push(k.slice(scope.length));
    }
    return keys;
  }

  proto.getItem = function (key) {
    return native.getItem.call(this, scope + key);
  };
  proto.setItem = function (key, value) {
    return native.setItem.call(this, scope + key, value);
  };
  proto.removeItem = function (key) {
    return native.removeItem.call(this, scope + key);
  };
  proto.key = function (index) {
    var k = ownKeys(this)[index];
    return k === undefined ? null : k;
  };
  proto.clear = function () {
    var keys = ownKeys(this);
    for (var i = 0; i < keys.length; i++) native.removeItem.call(this, scope + keys[i]);
  };
  Object.defineProperty(proto, 'length', {
    configurable: true,
    get: function () {
      return ownKeys(this).length;
    },
  });

  // Cross-tab "storage" events carry the stored (prefixed) key: hide other
  // apps' events and strip the prefix from this app's.
  function translate(event) {
    if (!(event instanceof StorageEvent) || event.key === null) return event;
    if (event.key.indexOf(scope) !== 0) return null;
    return new StorageEvent('storage', {
      key: event.key.slice(scope.length),
      oldValue: event.oldValue,
      newValue: event.newValue,
      url: event.url,
      storageArea: event.storageArea,
    });
  }

  var wrappers = new WeakMap();
  var add = window.addEventListener;
  var remove = window.removeEventListener;
  window.addEventListener = function (type, listener, options) {
    if (type !== 'storage' || !listener) return add.call(this, type, listener, options);
    var wrapped = wrappers.get(listener);
    if (!wrapped) {
      wrapped = function (event) {
        var e = translate(event);
        if (!e) return;
        return typeof listener === 'function' ? listener.call(this, e) : listener.handleEvent(e);
      };
      wrappers.set(listener, wrapped);
    }
    return add.call(this, type, wrapped, options);
  };
  window.removeEventListener = function (type, listener, options) {
    var wrapped = type === 'storage' && listener && wrappers.get(listener);
    return remove.call(this, type, wrapped || listener, options);
  };
})();
