bridge.js uses a variety of transport mechanisms to provide consistent, simple communication between almost any browser JavaScript context.

During the connection phase we pass messages between different endpoints using various `.postMessage()` APIs. Once a Clients connection request is recieved by a Service, a direct `MessageChannel` is opened, through which all subsequent messages are passed.