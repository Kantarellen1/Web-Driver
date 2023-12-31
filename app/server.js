const express = require('express');
const session = require('express-session');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server)
require('dotenv').config();
const { AddGps, AddRotation, AddSonar } = require("./classes/drivingHistory")

//session setup
const sessions = session({
    secret: 'ekweori324ijfg230',
    resave: false,
    saveUninitialized: true
});

app.use(sessions);
io.engine.use(sessions)

app.set('view engine', 'ejs');
app.use(express.static(__dirname));
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Routers
app.use('/', require('./routes/account'));
app.use('/dashboard', require('./routes/home'));
app.use('/company', require('./routes/company'));
app.use('/history', require('./routes/history'));
app.use('/requests', require('./routes/requests'));

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

const sessionMap = new Map()
io.on('connection', (socket) => {
    const users = {};
    let user = socket.request.session.userId
    let drivingSession = socket.request.session.drivingSession
    let device = socket.request.session.connectedDevice
    if (user) {
        socket.on('join-room-user', (data) => {
            socket.on('ready', () => {
                setInterval(() => {
                    socket.emit('rotation', 45);
                }, 1000);
            });
            const { deviceId } = data;
            userId = socket.request.session.userId
            // Update the user's socket ID or add a new user to the room
            if (!users[deviceId]) {
                users[deviceId] = {};
            }

            users[deviceId][userId] = { socketId: socket.id };
            sessionMap.set(device, { user, drivingSession });

            console.log(`${device}: `, sessionMap.get(device));
            // Log the updated users information
            // console.log(users);

            // Join the room
            socket.join(deviceId);

            // Emit a message to the user who just joined the room
            socket.emit('joined-message', `Welcome to user ${userId} to deviceId: ${deviceId}`);

            // Emit a message to all users in the room except the newly joined user
            socket.to(deviceId).emit('joined-message', `${userId} has joined the room`);

            socket.on("move", (direction) => {
                // console.log(": "+ direction)
                socket.to(deviceId).emit("move", direction)
            })
        });
    }
    else if (!user) {
        socket.on('join-room-device', (data) => {

            const { pass, deviceId } = data
            console.log("device:", deviceId)

            if (pass != process.env.DEVICE_PASS) {
                socket.disconnect();
                return
            }

            socket.join(deviceId)
            socket.emit('joined-message', `Welcome to device: ${deviceId}`);

            socket.on("gps", (lat, long) => {
                if (!sessionMap.get(deviceId)) return;
                AddGps(sessionMap.get(deviceId).drivingSession, Date.now(), lat, long);
            })

            socket.on("rotation", (rotation) => {
                if (!sessionMap.get(deviceId)) return;
                socket.to(deviceId).emit("rotation", rotation)
                AddRotation(sessionMap.get(deviceId).drivingSession, Date.now(), rotation);
            })

            socket.on("sonar", (f, l, r) => {
                if (!sessionMap.get(deviceId)) return;
                socket.to(deviceId).emit("sonar", f, l, r);
                AddSonar(sessionMap.get(deviceId).drivingSession, Date.now(), f, l, r);
            })
        })
    }

});

