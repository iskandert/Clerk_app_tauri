const callbacksByEvent = {};

const on = (eventName, callback) => {
    if (!callbacksByEvent[eventName]) {
        callbacksByEvent[eventName] = [];
    }
    callbacksByEvent[eventName].push(callback);
};

const off = (eventName, callback) => {
    callbacksByEvent[eventName] = callbacksByEvent[eventName].filter(eventCallback => callback !== eventCallback);
};

const emit = (eventName, data = undefined) => {
    const callbacks = callbacksByEvent[eventName];
    if (callbacks) {
        callbacks.forEach(callback => callback.call(null, data));
    }
};

const emitHelper = { on, off, emit };
export default emitHelper;
