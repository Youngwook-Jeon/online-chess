const socket = io();

socket.emit("hello", "Mayer");
socket.on("hello", (name) => {
  console.log("Hello " + name);
});