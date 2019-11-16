function init() {
    if (document.body && document.head) {
        patchXhr();
    } else {
        requestIdleCallback(init);
    }
}

function patchXhr() {
    console.log("patchXhr");

    let shellcode = document.createElement("script");
    shellcode.type = "text/javascript";

    shellcode.innerHTML = `
        function hookSetter(obj, key, fun) {
            let descriptor = Object.create(null);

            descriptor.enumerable = true;
            descriptor.configurable = true;

            let value;

            descriptor.get = () => {
                return value;
            };

            descriptor.set = function(newValue) {
                value = fun.call(this, newValue);
            };

            Object.defineProperty(
                obj, key,
                descriptor
            );
        }

        (function() {
            console.log("<shellcode>");

            let xhr = XMLHttpRequest.prototype;

            let xhrOpen = xhr.open;

            xhr.open = function(method, url) {
                this.__contentScript__url = url;
                console.log("open " + url);
                return xhrOpen.apply(this, arguments);
            };

            let xhrAddEventListener = xhr.addEventListener;

            xhr.addEventListener = function(event, callback) {
                console.log("addEventListener");

                if (event != "load") {
                    return xhrAddEventListener.apply(this, arguments);
                }

                return xhrAddEventListener.call(this, event, function() {
                    console.log(arguments[0]);
                    return callback.apply(this, arguments);
                });
            };

            let xhrSetOnreadystatechange = xhr.__lookupSetter__("onreadystatechange");

            hookSetter(xhr, "onreadystatechange", function(callback) {
                console.log("set onreadystatechange");

                let newCallback = function() {
                    console.log("onreadystatechange");

                    if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
                        console.log(this.responseText);
                    }

                    return callback.apply(this, arguments);
                };

                xhrSetOnreadystatechange.call(this, newCallback);

                return newCallback;
            });
        })();
    `;

    document.head.prepend(shellcode);
}

requestIdleCallback(init);
