const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const port = 4001;
const index = require("./routes/index");

const app = express();
app.use(index);

const server = http.createServer(app);

const io = socketIo(server);
let interval;
io.on("connection", (socket) => {
  console.log("New client connected");
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getApiAndEmit(socket), 1000);
  socket.on("disconnect", () => {
    console.log("Client disconnected");
    clearInterval(interval);
  });
});
const getApiAndEmit = (socket) => {
  let currentTime =
    new Date().getHours() +
    ":" +
    new Date().getMinutes() +
    ":" +
    new Date().getSeconds();
  const response = getSensorReading(currentTime);
  // Emitting a new message. Will be consumed by the client
  socket.emit("FromAPI", response);
};

// SENSOR READINGS
const getSensorReading = (i) => {
  // Pressure Sensor - MPXV7002 -
  let temperature = Math.random() * 30;
  let PressureDiffOne = Math.random() * 200;
  let PressureDiffTwo = Math.random() * 200;
  let filteredPressureDiffOne = kalmanFilter(PressureDiffOne);
  let filteredPressureDiffTwo = kalmanFilter(PressureDiffTwo);
  let pitch = Math.random();
  let depth = Math.random() * 30;
  let roll = Math.random();
  let newZ1pos = Math.random() * 10;
  let newZ2pos = Math.random() * 10;
  let newZ3pos = Math.random() * 10;
  let correctedPressDiffOne =
    filteredPressureDiffOne -
    (newZ2pos - newZ1pos) * AVG_SEAWATER_DENSITY * GRAVITATIONAL_CONSTANT;
  let correctedPressDiffTwo =
    filteredPressureDiffTwo -
    (newZ3pos - newZ1pos) * AVG_SEAWATER_DENSITY * GRAVITATIONAL_CONSTANT;

  let velocity = Math.pow(
    (2 *
      COEFFICIENT *
      (Math.pow(correctedPressDiffOne, 2) *
        Math.pow(correctedPressDiffTwo, 2))) /
      Math.pow(AVG_SEAWATER_DENSITY, 2),
    1 / 4
  );
  velocity = Math.floor(velocity);
  return {
    id: i,
    velocity: velocity,
    depth: depth,
    pitch: pitch,

    roll: roll,
    temperature: temperature,
    rawPressure: { p1: PressureDiffOne, p2: PressureDiffTwo },
    filteredPressure: {
      p1: filteredPressureDiffOne,
      p2: filteredPressureDiffTwo,
    },
    correctedPressure: {
      p1: correctedPressDiffOne,
      p2: correctedPressDiffTwo,
    },
  };
};

//DATA FILTERING
let x = 0; //Initial Velocity
let p = 1000; //Initial Error Variance
let q = 0.1; //Process Noise Variance
let p_x = x;
let p_p = p + q;
const kalmanFilter = (obsValue) => {
  let z = obsValue;
  let r = 0.01; // Accuracy
  let K = p_p / (p_p + r); // Kalman Gain
  let currX = p_x + K * (z - p_x);
  let currP = (1 - K) * p_p;
  p_x = currX;
  p_p = currP + q;
  return currX;
};
server.listen(port, () => {
  console.log("Listening");
});

const GRAVITATIONAL_CONSTANT = 6.6743e-11;
const AVG_SEAWATER_DENSITY = 1025;
const COEFFICIENT = 16 / (81 * Math.pow(Math.sin(35), 4));
console.log(COEFFICIENT);
