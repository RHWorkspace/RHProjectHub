/**
 * Singleton toast event emitter.
 * Any module can call toast.success/error/warning/info to trigger a notification.
 * The Toast component (rendered inside AppLayout) subscribes and displays them.
 */

let _nextId = 0;
const listeners = new Set();

export const toast = {
    show(type, message, duration = 4200) {
        const item = { id: ++_nextId, type, message, duration };
        listeners.forEach(fn => fn('add', item));
        return item.id;
    },
    success: (msg, duration) => toast.show('success', msg, duration),
    error:   (msg, duration) => toast.show('error',   msg, duration),
    warning: (msg, duration) => toast.show('warning', msg, duration),
    info:    (msg, duration) => toast.show('info',    msg, duration),
    dismiss: (id) => listeners.forEach(fn => fn('remove', id)),
    _subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    },
};
